import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const maxDuration = 90;

// GET: 실습 신청 목록 조회
export async function GET() {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('practice_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching practice applications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch practice applications' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error reading practice applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch practice applications' },
      { status: 500 }
    );
  }
}

// POST: 실습 신청 저장
export async function POST(request: NextRequest) {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      name,
      gender,
      contact,
      birth_date,
      address,
      address_detail,
      zonecode,
      practice_type,
      desired_job_field,
      employment_types,
      has_resume,
      certifications,
      payment_amount,
      privacy_agreed,
      terms_agreed,
      click_source,
    } = body;

    // 필수 필드 검사
    if (
      !name ||
      !gender ||
      !contact ||
      !birth_date ||
      !address ||
      !practice_type ||
      !desired_job_field ||
      !employment_types ||
      !Array.isArray(employment_types) ||
      employment_types.length === 0 ||
      typeof has_resume !== 'boolean'
    ) {
      return NextResponse.json(
        { error: 'All required fields must be filled' },
        { status: 400 }
      );
    }

    // 성별 검증
    if (!['남', '여'].includes(gender)) {
      return NextResponse.json({ error: 'Invalid gender' }, { status: 400 });
    }

    // 실습 유형 검증
    const validPracticeTypes = [
      '사회복지사 실습 160시간',
      '사회복지사 실습 120시간',
      '보육교사 실습 240시간',
      '평생교육사 실습 160시간',
      '한국어교원 실습',
    ];
    if (!validPracticeTypes.includes(practice_type)) {
      return NextResponse.json(
        { error: 'Invalid practice type' },
        { status: 400 }
      );
    }

    // 고용형태 검증
    const validEmploymentTypes = ['정규직', '계약직', '파트타임', '부업'];
    const invalidTypes = employment_types.filter(
      (t: string) => !validEmploymentTypes.includes(t)
    );
    if (invalidTypes.length > 0) {
      return NextResponse.json(
        { error: 'Invalid employment type' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('practice_applications')
      .insert([
        {
          name,
          gender,
          contact,
          birth_date,
          address,
          address_detail: address_detail || null,
          zonecode: zonecode || null,
          practice_type,
          desired_job_field,
          employment_types,
          has_resume,
          certifications: certifications || null,
          payment_amount: payment_amount || 110000,
          payment_status: 'pending',
          privacy_agreed: privacy_agreed || false,
          terms_agreed: terms_agreed || false,
          click_source: click_source || null,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error saving practice application:', error);
      return NextResponse.json(
        { error: 'Failed to save practice application' },
        { status: 500 }
      );
    }

    // payapp 링크결제(payrequest) API 호출
    let payurl: string | null = null;
    if (process.env.PAYAPP_USERID && process.env.PAYAPP_LINK_KEY) {
      try {
        const recvphone = contact.replace(/-/g, '');
        const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');

        const payappParams = new URLSearchParams({
          cmd: 'payrequest',
          userid: process.env.PAYAPP_USERID,
          linkkey: process.env.PAYAPP_LINK_KEY,
          shopname: process.env.PAYAPP_SHOP_NAME || '한평생교육',
          goodname: `한평생교육 실습 섭외 신청 - ${practice_type}`,
          price: '110000',
          recvphone,
          memo: name,
          feedbackurl: `${baseUrl}/api/payapp/feedback`,
          returnurl: `${baseUrl}/api/payapp/result?var1=${data.id}`,
          var1: data.id,
          skip_cstpage: 'y',
          smsuse: 'n',
          openpaytype: 'card,kakaopay,naverpay,payco,applepay,myaccount',
          amount_taxable: '100000',
          amount_taxfree: '0',
          amount_vat: '10000',
        });

        const payappRes = await fetch('https://api.payapp.kr/oapi/apiLoad.html', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: payappParams.toString(),
        });

        const payappText = await payappRes.text();
        console.log('[PAYAPP] 응답:', payappText);

        const payappData = Object.fromEntries(new URLSearchParams(payappText));

        if (payappData.state === '1' && payappData.payurl) {
          await supabaseAdmin
            .from('practice_applications')
            .update({
              payment_id: String(payappData.mul_no),
              payment_status: 'requested',
            })
            .eq('id', data.id);

          payurl = payappData.payurl;
          console.log('[PAYAPP] 결제 요청 성공 mul_no:', payappData.mul_no);
        } else {
          console.error('[PAYAPP] 결제 요청 실패:', payappData.errorMessage);
          await supabaseAdmin
            .from('practice_applications')
            .update({ payment_status: 'failed' })
            .eq('id', data.id);

          return NextResponse.json(
            { error: payappData.errorMessage || '결제 요청에 실패했습니다. 다시 시도해주세요.' },
            { status: 400 }
          );
        }
      } catch (payappError) {
        console.error('[PAYAPP] 오류:', payappError);
        // payapp 오류 시에도 신청은 유지 (관리자가 수동 처리)
      }
    } else {
      console.warn('[PAYAPP] PAYAPP_USERID 또는 PAYAPP_LINK_KEY 환경변수 미설정');
    }

    // Slack 알림 전송
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        const slackMessage = {
          text: '📝 *새로운 실습 섭외 신청이 접수되었습니다*',
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '📝 새로운 실습 섭외 신청',
              },
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*이름:*\n${name}` },
                { type: 'mrkdwn', text: `*성별:*\n${gender}` },
                { type: 'mrkdwn', text: `*연락처:*\n${contact}` },
                { type: 'mrkdwn', text: `*생년월일:*\n${birth_date}` },
                { type: 'mrkdwn', text: `*주소:*\n${address}${address_detail ? ' ' + address_detail : ''}` },
                { type: 'mrkdwn', text: `*실습 유형:*\n${practice_type}` },
                { type: 'mrkdwn', text: `*취업 희망분야:*\n${desired_job_field}` },
                { type: 'mrkdwn', text: `*고용형태:*\n${employment_types.join(', ')}` },
                { type: 'mrkdwn', text: `*이력서 보유:*\n${has_resume ? '보유함' : '보유하지 않음'}` },
                { type: 'mrkdwn', text: `*보유 자격증:*\n${certifications || '없음'}` },
                { type: 'mrkdwn', text: `*결제금액:*\n110,000원` },
                { type: 'mrkdwn', text: `*유입경로:*\n${click_source || '미입력'}` },
              ],
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `접수 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
                },
              ],
            },
          ],
        };

        const slackResponse = await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackMessage),
        });

        if (!slackResponse.ok) {
          console.error('[SLACK] 알림 전송 실패:', await slackResponse.text());
        }
      } catch (slackError) {
        console.error('[SLACK] 알림 전송 중 오류:', slackError);
      }
    }

    return NextResponse.json(
      { message: 'Practice application submitted successfully', data, payurl },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error saving practice application:', error);
    return NextResponse.json(
      { error: 'Failed to save practice application' },
      { status: 500 }
    );
  }
}

// PATCH: 상태 업데이트
export async function PATCH(request: NextRequest) {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: 'At least one field is required for update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('practice_applications')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating practice application:', error);
      return NextResponse.json(
        { error: 'Failed to update practice application' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Practice application updated successfully',
      data,
    });
  } catch (error) {
    console.error('Error updating practice application:', error);
    return NextResponse.json(
      { error: 'Failed to update practice application' },
      { status: 500 }
    );
  }
}

// DELETE: 실습 신청 삭제
export async function DELETE(request: NextRequest) {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'IDs array is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('practice_applications')
      .delete()
      .in('id', ids)
      .select();

    if (error) {
      console.error('Error deleting practice applications:', error);
      return NextResponse.json(
        { error: 'Failed to delete practice applications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Practice applications deleted successfully',
      data,
    });
  } catch (error) {
    console.error('Error deleting practice applications:', error);
    return NextResponse.json(
      { error: 'Failed to delete practice applications' },
      { status: 500 }
    );
  }
}
