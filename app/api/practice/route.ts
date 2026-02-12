import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// Vercel Serverless 함수 타임아웃 설정 (초 단위)
export const maxDuration = 90;

// GET: 실습 신청 목록 조회
export async function GET() {
  try {
    // 환경 변수 확인
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
    // 환경 변수 확인
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
      student_name,
      gender,
      contact,
      birth_date,
      residence_area,
      address,
      practice_start_date,
      grade_report_date,
      preferred_semester,
      practice_type,
      preferred_days,
      has_car,
      cash_receipt_number,
      privacy_agreed,
      click_source,
    } = body;

    // 유효성 검사 - 필수 필드
    if (
      !student_name ||
      !gender ||
      !contact ||
      !birth_date ||
      !residence_area ||
      !address ||
      !practice_start_date ||
      !grade_report_date ||
      !preferred_semester ||
      !practice_type ||
      !preferred_days
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

    // 실습 종류 검증
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

    // 희망 요일 검증
    if (!['주말', '평일'].includes(preferred_days)) {
      return NextResponse.json(
        { error: 'Invalid preferred days' },
        { status: 400 }
      );
    }

    // Supabase에 데이터 저장
    const { data, error } = await supabaseAdmin
      .from('practice_applications')
      .insert([
        {
          student_name,
          gender,
          contact,
          birth_date,
          residence_area,
          address,
          practice_start_date,
          grade_report_date,
          preferred_semester,
          practice_type,
          preferred_days,
          has_car: has_car || false,
          cash_receipt_number: cash_receipt_number || null,
          privacy_agreed: privacy_agreed || false,
          click_source: click_source || null,
          status: 'pending', // 기본 상태
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

    // Slack 알림 전송
    if (process.env.SLACK_WEBHOOK_URL) {
      console.log('[SLACK] Slack 알림 전송 시도');
      try {
        const slackMessage = {
          text: '📝 *새로운 실습 신청이 접수되었습니다*',
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '📝 새로운 실습 신청',
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*학생 이름:*\n${student_name}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*성별:*\n${gender}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*연락처:*\n${contact}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*생년월일:*\n${birth_date}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*거주지:*\n${residence_area}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*실습 종류:*\n${practice_type}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*실습 시작일:*\n${practice_start_date}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*희망 요일:*\n${preferred_days}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*자차 여부:*\n${has_car ? '있음' : '없음'}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*유입경로:*\n${click_source || '미입력'}`,
                },
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
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(slackMessage),
        });

        if (slackResponse.ok) {
          console.log('[SLACK] Slack 알림 전송 성공');
        } else {
          console.error(
            '[SLACK] Slack 알림 전송 실패:',
            await slackResponse.text()
          );
        }
      } catch (slackError) {
        console.error('[SLACK] Slack 알림 전송 중 오류:', slackError);
      }
    } else {
      console.warn(
        '[SLACK] SLACK_WEBHOOK_URL이 설정되지 않아 Slack 알림을 건너뜁니다'
      );
    }

    return NextResponse.json(
      { message: 'Practice application submitted successfully', data },
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

// PATCH: 실습 신청 상태 업데이트
export async function PATCH(request: NextRequest) {
  try {
    // 환경 변수 확인
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
    // 환경 변수 확인
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
