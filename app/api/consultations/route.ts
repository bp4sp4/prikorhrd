import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendConsultationEmail } from '@/lib/email';

// Vercel Serverless 함수 타임아웃 설정 (초 단위)
export const maxDuration = 90;

// GET: 상담 신청 목록 조회
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
      .from('consultations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching consultations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch consultations' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error reading consultations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consultations' },
      { status: 500 }
    );
  }
}

// POST: 상담 신청 저장
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
    const { name, contact, education, reason, click_source, is_manual_entry } = body;

    // 유효성 검사 - 이름과 연락처만 필수
    if (!name || !contact) {
      return NextResponse.json(
        { error: 'Name and contact are required' },
        { status: 400 }
      );
    }

    // Supabase에 데이터 저장
    const { data, error } = await supabaseAdmin
      .from('consultations')
      .insert([
        {
          name,
          contact,
          education: education || null,
          reason: reason || null,
          click_source: click_source || null,
          status: '상담대기', // 기본 상태
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error saving consultation:', error);
      return NextResponse.json(
        { error: 'Failed to save consultation' },
        { status: 500 }
      );
    }

    // 이메일 알림 전송 (비동기, 실패해도 상담 신청은 성공 처리)
    // 수동 추가가 아닐 때만 이메일 전송
    if (!is_manual_entry) {
      console.log('[EMAIL] 이메일 전송 시도 시작');
      console.log('[EMAIL] 환경 변수 확인:');
      console.log(
        '[EMAIL] - BREVO_SMTP_LOGIN 존재:',
        !!process.env.BREVO_SMTP_LOGIN
      );
    console.log(
      '[EMAIL] - BREVO_SMTP_LOGIN 값:',
      process.env.BREVO_SMTP_LOGIN
        ? `${process.env.BREVO_SMTP_LOGIN.substring(0, 3)}***`
        : '없음'
    );
    console.log('[EMAIL] - BREVO_SMTP_KEY 존재:', !!process.env.BREVO_SMTP_KEY);
    console.log(
      '[EMAIL] - BREVO_SMTP_KEY 길이:',
      process.env.BREVO_SMTP_KEY ? process.env.BREVO_SMTP_KEY.length : 0
    );
    console.log(
      '[EMAIL] - CONSULTATION_EMAIL:',
      process.env.CONSULTATION_EMAIL || '없음'
    );
    console.log(
      '[EMAIL] - BREVO_FROM_EMAIL:',
      process.env.BREVO_FROM_EMAIL || '없음'
    );
    console.log(
      '[EMAIL] - BREVO_FROM_NAME:',
      process.env.BREVO_FROM_NAME || '없음'
    );

    // Brevo 환경 변수 확인
    if (process.env.BREVO_SMTP_LOGIN && process.env.BREVO_SMTP_KEY) {
      console.log('[EMAIL] 이메일 전송 함수 호출');
      // await로 기다려서 Serverless 함수가 종료되기 전에 이메일 전송 완료
      try {
        const emailResult = await sendConsultationEmail({
          name,
          contact,
          education,
          reason,
          click_source: click_source || null,
        });
        console.log(
          '[EMAIL] 이메일 전송 결과:',
          JSON.stringify(emailResult, null, 2)
        );
      } catch (emailError: unknown) {
        // 이메일 전송 실패해도 상담 신청은 성공 처리
        console.error('[EMAIL] 이메일 전송 실패:');
        console.error(
          '[EMAIL] 에러 타입:',
          emailError instanceof Error
            ? emailError.constructor.name
            : typeof emailError
        );
        console.error(
          '[EMAIL] 에러 메시지:',
          emailError instanceof Error ? emailError.message : String(emailError)
        );
        console.error(
          '[EMAIL] 에러 스택:',
          emailError instanceof Error ? emailError.stack : '스택 없음'
        );
        console.error(
          '[EMAIL] 전체 에러 객체:',
          JSON.stringify(emailError, Object.getOwnPropertyNames(emailError), 2)
        );
      }
    } else {
      console.warn(
        '[EMAIL] Brevo 환경 변수가 설정되지 않아 이메일 전송을 건너뜁니다'
      );
      console.warn(
        '[EMAIL] 필요한 환경 변수: BREVO_SMTP_LOGIN, BREVO_SMTP_KEY'
      );
    }
    } else {
      console.log('[EMAIL] 수동 추가로 이메일 전송을 건너뜁니다.');
    }

    return NextResponse.json(
      { message: 'Consultation request submitted successfully', data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error saving consultation:', error);
    return NextResponse.json(
      { error: 'Failed to save consultation' },
      { status: 500 }
    );
  }
}

// PATCH: 상담 완료 상태 업데이트
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
    const { id, is_completed, notes, status, memo, name, contact, education, reason, click_source } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // 업데이트할 필드 구성
    const updateData: {
      is_completed?: boolean;
      notes?: string;
      status?: 'pending' | 'in_progress' | 'completed';
      memo?: string;
      name?: string;
      contact?: string;
      education?: string | null;
      reason?: string | null;
      click_source?: string | null;
    } = {};

    if (typeof is_completed === 'boolean') {
      updateData.is_completed = is_completed;
    }

    if (status !== undefined) {
      updateData.status = status;
      // status가 있으면 is_completed도 함께 업데이트
      if (status === 'completed') {
        updateData.is_completed = true;
      } else if (status === 'pending') {
        updateData.is_completed = false;
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (memo !== undefined) {
      updateData.memo = memo;
    }

    // 기본 정보 수정
    if (name !== undefined) {
      updateData.name = name;
    }

    if (contact !== undefined) {
      updateData.contact = contact;
    }

    if (education !== undefined) {
      updateData.education = education || null;
    }

    if (reason !== undefined) {
      updateData.reason = reason || null;
    }

    if (click_source !== undefined) {
      updateData.click_source = click_source || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'At least one field is required for update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('consultations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating completion status:', error);
      return NextResponse.json(
        { error: 'Failed to update completion status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Completion status updated successfully',
      data,
    });
  } catch (error) {
    console.error('Error updating completion status:', error);
    return NextResponse.json(
      { error: 'Failed to update completion status' },
      { status: 500 }
    );
  }
}

// DELETE: 상담 신청 삭제
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
      .from('consultations')
      .delete()
      .in('id', ids)
      .select();

    if (error) {
      console.error('Error deleting consultations:', error);
      return NextResponse.json(
        { error: 'Failed to delete consultations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Consultations deleted successfully',
      data,
    });
  } catch (error) {
    console.error('Error deleting consultations:', error);
    return NextResponse.json(
      { error: 'Failed to delete consultations' },
      { status: 500 }
    );
  }
}
