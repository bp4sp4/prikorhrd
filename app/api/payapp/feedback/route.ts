import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// payapp이 결제 완료 후 서버로 직접 호출하는 feedbackurl (서버-서버)
// 사용자가 창을 닫아도 호출됨
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);

    const state = params.get('state');
    const mul_no = params.get('mul_no');
    const tradeid = params.get('tradeid');
    const var1 = params.get('var1'); // 신청 ID
    const price = params.get('price');
    const paymethod = params.get('paymethod');
    const message = params.get('message') || params.get('errorMessage');

    console.log('[PAYAPP FEEDBACK]', { state, mul_no, tradeid, var1, price, paymethod });

    if (!var1) {
      console.error('[PAYAPP FEEDBACK] var1(신청 ID) 누락');
      return new NextResponse('FAIL', { status: 400 });
    }

    if (state === '1' || (state === null && mul_no)) {
      // 결제 성공 → DB 업데이트
      const { error } = await supabaseAdmin
        .from('practice_applications')
        .update({
          payment_status: 'paid',
          payment_id: mul_no || undefined,
          status: 'confirmed',
        })
        .eq('id', var1);

      if (error) {
        console.error('[PAYAPP FEEDBACK] DB 업데이트 실패:', error);
        return new NextResponse('FAIL', { status: 200 });
      }

      console.log(`[PAYAPP FEEDBACK] 결제 완료 처리 - 신청 ID: ${var1}, mul_no: ${mul_no}, 금액: ${price}원`);

      // Slack 알림
      if (process.env.SLACK_WEBHOOK_URL) {
        try {
          // 신청자 전체 정보 조회
          const { data: appData } = await supabaseAdmin
            .from('practice_applications')
            .select('*')
            .eq('id', var1)
            .single();

          const payMethodMap: Record<string, string> = {
            card: '신용/체크카드',
            kakaopay: '카카오페이',
            naverpay: '네이버페이',
            payco: '페이코',
            applepay: '애플페이',
            myaccount: '내통장결제',
          };
          const payMethodLabel = paymethod ? (payMethodMap[paymethod] || paymethod) : '미확인';
          const priceFormatted = price ? Number(price).toLocaleString('ko-KR') : '110,000';

          const fields: { type: string; text: string }[] = [
            { type: 'mrkdwn', text: `*이름:*\n${appData?.name || '-'}` },
            { type: 'mrkdwn', text: `*연락처:*\n${appData?.contact || '-'}` },
            { type: 'mrkdwn', text: `*성별:*\n${appData?.gender || '-'}` },
            { type: 'mrkdwn', text: `*생년월일:*\n${appData?.birth_date || '-'}` },
            { type: 'mrkdwn', text: `*주소:*\n${appData?.address || '-'}${appData?.address_detail ? ' ' + appData.address_detail : ''}` },
            { type: 'mrkdwn', text: `*실습 유형:*\n${appData?.practice_type || '-'}` },
            { type: 'mrkdwn', text: `*취업 희망분야:*\n${appData?.desired_job_field || '-'}` },
            { type: 'mrkdwn', text: `*고용형태:*\n${appData?.employment_types?.join(', ') || '-'}` },
            { type: 'mrkdwn', text: `*이력서 보유:*\n${appData?.has_resume ? '보유함' : '보유하지 않음'}` },
            { type: 'mrkdwn', text: `*결제금액:*\n${priceFormatted}원` },
          ];

          if (appData?.certifications) {
            fields.push({ type: 'mrkdwn', text: `*보유 자격증:*\n${appData.certifications}` });
          }
          if (appData?.click_source) {
            fields.push({ type: 'mrkdwn', text: `*유입경로:*\n${appData.click_source}` });
          }
          fields.push({ type: 'mrkdwn', text: `*결제수단:*\n${payMethodLabel}` });
          fields.push({ type: 'mrkdwn', text: `*결제번호:*\n${mul_no || '-'}` });

          await fetch(process.env.SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: '💳 결제 완료 - 새로운 실습 섭외 신청',
              blocks: [
                {
                  type: 'header',
                  text: {
                    type: 'plain_text',
                    text: '💳 결제 완료 - 새로운 실습 섭외 신청',
                  },
                },
                {
                  type: 'section',
                  fields,
                },
                {
                  type: 'context',
                  elements: [
                    {
                      type: 'mrkdwn',
                      text: `결제 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
                    },
                  ],
                },
              ],
            }),
          });
        } catch {
          // Slack 알림 실패는 무시
        }
      }
    } else {
      // 결제 실패
      await supabaseAdmin
        .from('practice_applications')
        .update({ payment_status: 'failed' })
        .eq('id', var1);

      console.error(`[PAYAPP FEEDBACK] 결제 실패 - 신청 ID: ${var1}, 오류: ${message}`);
    }

    // payapp에 SUCCESS 반환 → 재시도 중단
    return new NextResponse('SUCCESS', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    console.error('[PAYAPP FEEDBACK] 처리 오류:', error);
    return new NextResponse('FAIL', { status: 200 });
  }
}

// GET 요청도 허용 (payapp이 가끔 GET으로 확인하는 경우)
export async function GET() {
  return new NextResponse('OK', { status: 200 });
}
