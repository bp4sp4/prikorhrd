import nodemailer from "nodemailer";

interface ConsultationEmailData {
  name: string;
  contact: string;
  click_source?: string | null;
}

// Brevo SMTP Transporter 생성
function createTransporter() {
  const smtpLogin = process.env.BREVO_SMTP_LOGIN;
  const smtpKey = process.env.BREVO_SMTP_KEY;

  if (!smtpLogin || !smtpKey) {
    throw new Error("BREVO_SMTP_LOGIN and BREVO_SMTP_KEY must be set");
  }

  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 465, // SSL 포트 사용 (Vercel 등 클라우드 플랫폼에서 더 안정적)
    secure: true, // 465 포트 사용 시 true
    auth: {
      user: smtpLogin,
      pass: smtpKey,
    },
    connectionTimeout: 10000, // 10초
    greetingTimeout: 10000, // 10초
    socketTimeout: 10000, // 10초
  });
}

export async function sendConsultationEmail(data: ConsultationEmailData) {
  console.log("[EMAIL] sendConsultationEmail 함수 시작");
  console.log(
    "[EMAIL] 받은 데이터:",
    JSON.stringify({ ...data, contact: data.contact ? "***" : "" }, null, 2)
  );

  try {
    // Brevo 설정 확인
    const smtpLogin = process.env.BREVO_SMTP_LOGIN;
    const smtpKey = process.env.BREVO_SMTP_KEY;
    const fromEmail = process.env.BREVO_FROM_EMAIL || smtpLogin;
    const fromName = process.env.BREVO_FROM_NAME || "한평생 바로기업";

    // 수신자 이메일: CONSULTATION_EMAIL이 있으면 사용, 없으면 기본값
    const recipientEmail = process.env.CONSULTATION_EMAIL || "bp4sp4@naver.com";
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://바로기업.com";
    const logoUrl = `${baseUrl}/images/main/logo_black.png`;

    console.log("[EMAIL] 설정 확인:");
    console.log("[EMAIL] - BREVO_SMTP_LOGIN 존재:", !!smtpLogin);
    console.log(
      "[EMAIL] - BREVO_SMTP_LOGIN 값:",
      smtpLogin ? `${smtpLogin.substring(0, 3)}***` : "없음"
    );
    console.log("[EMAIL] - BREVO_SMTP_KEY 존재:", !!smtpKey);
    console.log("[EMAIL] - BREVO_SMTP_KEY 길이:", smtpKey ? smtpKey.length : 0);
    console.log(
      "[EMAIL] - BREVO_FROM_EMAIL:",
      fromEmail ? `${fromEmail.substring(0, 3)}***` : "없음"
    );
    console.log(
      "[EMAIL] - recipientEmail:",
      recipientEmail ? `${recipientEmail.substring(0, 3)}***` : "없음"
    );
    console.log("[EMAIL] - baseUrl:", baseUrl);
    console.log("[EMAIL] - logoUrl:", logoUrl);

    if (!smtpLogin || !smtpKey) {
      console.error("[EMAIL] Brevo 환경 변수가 설정되지 않음");
      return {
        success: false,
        error: "BREVO_SMTP_LOGIN and BREVO_SMTP_KEY must be set",
      };
    }

    if (!recipientEmail) {
      console.error("[EMAIL] 수신자 이메일이 설정되지 않음");
      return { success: false, error: "Email not configured" };
    }

    // Transporter 생성
    const transporter = createTransporter();

    // SMTP 연결 확인
    console.log("[EMAIL] SMTP 연결 확인 중...");
    await new Promise<void>((resolve, reject) => {
      transporter.verify(function (error: Error | null) {
        if (error) {
          console.error("[EMAIL] SMTP 연결 확인 실패:", error);
          reject(error);
        } else {
          console.log("[EMAIL] SMTP 연결 확인 성공");
          resolve();
        }
      });
    });

    // 기존 HTML 템플릿 그대로 사용
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
          body { font-family: 'Pretendard', sans-serif; -webkit-font-smoothing: antialiased; }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #ffffff; color: #191f28;">
        <div style="max-width: 600px; margin: 0 auto; padding: 60px 24px;">
          <div style="margin-bottom: 48px;">
            <img src="${logoUrl}" alt="한평생 바로기업" style="height: 32px; width: auto;" />
          </div>

          <div style="margin-bottom: 40px;">
            <h1 style="font-size: 28px; font-weight: 700; line-height: 1.4; margin: 0; color: #191f28;">
              새로운 상담 신청이<br />도착했어요
            </h1>
          </div>

          <div style="background-color: #f9fafb; border-radius: 20px; padding: 32px;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding-bottom: 20px; font-size: 15px; color: #4e5968; width: 100px;">성함/기업명</td>
                <td style="padding-bottom: 20px; font-size: 17px; font-weight: 600; color: #191f28; text-align: right;">${
                  data.name
                }</td>
              </tr>
              <tr>
                <td style="padding-bottom: 20px; font-size: 15px; color: #4e5968;">연락처</td>
                <td style="padding-bottom: 20px; font-size: 17px; font-weight: 600; color: #3182f6; text-align: right;">
                  <a href="tel:${data.contact.replace(
                    /-/g,
                    ""
                  )}" style="color: #3182f6; text-decoration: none;">${
      data.contact
    }</a>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 20px; font-size: 15px; color: #4e5968;">유입 경로</td>
                <td style="padding-bottom: 20px; font-size: 17px; font-weight: 600; color: #191f28; text-align: right;">${
                  data.click_source || "바로기업 홈페이지"
                }</td>
              </tr>
              <tr style="border-top: 1px solid #ebedf0;">
                <td style="padding-top: 20px; font-size: 14px; color: #8b95a1;">신청 시각</td>
                <td style="padding-top: 20px; font-size: 14px; color: #8b95a1; text-align: right;">${new Date().toLocaleString(
                  "ko-KR"
                )}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 40px;">
            <a href="tel:${data.contact.replace(/-/g, "")}" 
               style="display: inline-block; background-color: #3182f6; color: #ffffff; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; text-decoration: none; width: calc(100% - 64px); text-align: center;">
              지금 바로 전화하기
            </a>
          </div>

          <div style="margin-top: 60px; padding-top: 32px; border-top: 1px solid #f2f4f6; text-align: left;">
            <p style="margin: 0; font-size: 13px; color: #8b95a1; line-height: 1.6;">
              본 메일은 한평생 바로기업 웹사이트를 통해 수신되었습니다.<br />
              서울시 도봉구 창동 마들로13길 61 씨드큐브 905호 | 02-2135-6221
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
새로운 상담 신청이 접수되었습니다.

이름(회사명): ${data.name}
연락처: ${data.contact}
유입 경로: ${data.click_source || "바로기업 홈페이지"}
신청 시간: ${new Date().toLocaleString("ko-KR")}
    `;

    // 이메일 전송
    const mailData = {
      from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
      to: recipientEmail,
      subject: `[상담 접수] ${data.name}님`,
      html: emailHtml,
      text: emailText,
    };

    console.log("[EMAIL] Brevo 전송 시도 중...");
    console.log("[EMAIL] - from:", mailData.from);
    console.log("[EMAIL] - to:", recipientEmail);
    console.log("[EMAIL] - subject:", mailData.subject);

    const info = await new Promise<nodemailer.SentMessageInfo>(
      (resolve, reject) => {
        transporter.sendMail(mailData, (err: Error | null, info: nodemailer.SentMessageInfo) => {
          if (err) {
            console.error("[EMAIL] sendMail 에러:", err);
            reject(err);
          } else {
            console.log("[EMAIL] sendMail 성공:", info);
            resolve(info);
          }
        });
      }
    );

    console.log("[EMAIL] ✅ 메일 전송 성공!");
    console.log("[EMAIL] - messageId:", info.messageId);
    console.log("[EMAIL] - response:", info.response);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[EMAIL] ❌ 메일 전송 실패! - catch 블록 진입");
    console.error("[EMAIL] 에러 발생 시각:", new Date().toISOString());
    console.error("[EMAIL] 에러 타입:", error?.constructor?.name);
    console.error(
      "[EMAIL] 에러 메시지:",
      error instanceof Error ? error.message : String(error)
    );
    console.error(
      "[EMAIL] 에러 스택:",
      error instanceof Error ? error.stack : "스택 없음"
    );

    // 전체 에러 객체 출력
    try {
      console.error(
        "[EMAIL] 전체 에러 객체:",
        JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      );
    } catch (e) {
      console.error("[EMAIL] 에러 객체 직렬화 실패:", e);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
