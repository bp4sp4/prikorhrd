import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// payapp이 결제 완료 후 호출하는 피드백 URL
// POST 파라미터: mul_no, state, price, var1(신청 ID), errorMessage 등
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);

    const state = params.get('state');
    const mul_no = params.get('mul_no');
    const var1 = params.get('var1');     // 신청 ID (POST 시 var1에 저장한 값)
    const price = params.get('price');
    const errorMessage = params.get('errorMessage');

    console.log('[PAYAPP FEEDBACK]', { state, mul_no, var1, price, errorMessage });

    if (!var1) {
      console.error('[PAYAPP FEEDBACK] var1(신청 ID) 누락');
      return new NextResponse('FAIL', { status: 400 });
    }

    if (state === '1' && mul_no) {
      // 결제 성공 → DB 업데이트
      const { error } = await supabaseAdmin
        .from('practice_applications')
        .update({
          payment_status: 'paid',
          payment_id: mul_no,
          status: 'confirmed',
        })
        .eq('id', var1);

      if (error) {
        console.error('[PAYAPP FEEDBACK] DB 업데이트 실패:', error);
        return new NextResponse('FAIL', { status: 500 });
      }

      console.log(`[PAYAPP FEEDBACK] 결제 완료 처리 - 신청 ID: ${var1}, mul_no: ${mul_no}, 금액: ${price}원`);

      // Slack 알림
      if (process.env.SLACK_WEBHOOK_URL) {
        try {
          await fetch(process.env.SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `💳 *결제 완료* - 신청 ID: ${var1} | 결제번호: ${mul_no} | 금액: ${price}원`,
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

      console.error(`[PAYAPP FEEDBACK] 결제 실패 - 신청 ID: ${var1}, 오류: ${errorMessage}`);
    }

    // payapp에 SUCCESS 반환 → 재시도 중단
    return new NextResponse('SUCCESS', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    console.error('[PAYAPP FEEDBACK] 처리 오류:', error);
    return new NextResponse('FAIL', { status: 500 });
  }
}

// GET 요청도 허용 (payapp이 가끔 GET으로 확인하는 경우)
export async function GET() {
  return new NextResponse('OK', { status: 200 });
}
