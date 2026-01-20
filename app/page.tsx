'use client';

import Image from 'next/image';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './stepflow.module.css';

// click_source 포맷팅 함수
const formatClickSource = (utmSource: string, materialId: string | null): string => {
  const sourceMap: { [key: string]: string } = {
    daangn: '당근마켓',
    insta: '인스타그램',
  };

  const koreanSource = sourceMap[utmSource] || utmSource;

  if (materialId) {
    return `${koreanSource}_소재_${materialId}`; // 예: "당근마켓_소재_123"
  }
  return koreanSource; // 예: "당근마켓"
};

// URL 파라미터를 읽는 컴포넌트
function ClickSourceHandler({ onSourceChange }: { onSourceChange: (source: string) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const utmSource = searchParams.get('utm_source');
    const materialId = searchParams.get('material_id');

    if (utmSource) {
      const formatted = formatClickSource(utmSource, materialId);
      onSourceChange(formatted);
    }
  }, [searchParams, onSourceChange]);

  return null;
}

function StepFlowContent({ clickSource }: { clickSource: string }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', // 업종 입력값
    contact: '',
  });
  const [loading, setLoading] = useState(false);
  const [contactError, setContactError] = useState('');

  // 연락처 포맷팅 (010-XXXX-XXXX)
  const formatContact = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 7) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
    }
  };

  // 연락처 검증
  const validateContact = (contact: string) => {
    const cleaned = contact.replace(/[-\s]/g, '');
    if (cleaned.length === 0) {
      setContactError('');
      return true;
    }
    if (!cleaned.startsWith('010') && !cleaned.startsWith('011')) {
      setContactError('010 또는 011로 시작하는 번호를 입력해주세요');
      return false;
    }
    setContactError('');
    return true;
  };

  // 데이터 저장 로직
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          contact: formData.contact,
          click_source: clickSource,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '저장에 실패했습니다.');
      }

      setStep(3);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(error instanceof Error ? error.message : '저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.name.length > 0 && formData.contact.replace(/[-\s]/g, '').length >= 10 && !contactError;

  return (
    <div className={styles.container}>
      {/* 헤더 - 전체 단계에 표시 */}
      <header className={styles.header}>
        {step > 1 && (
          <button
            className={styles.backButton}
            onClick={() => setStep(step - 1)}
            aria-label="뒤로가기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12.727 3.687C12.8172 3.59153 12.8878 3.47923 12.9346 3.3565C12.9814 3.23377 13.0036 3.10302 12.9999 2.97172C12.9961 2.84042 12.9666 2.71113 12.9129 2.59125C12.8592 2.47136 12.7825 2.36322 12.687 2.273C12.5915 2.18279 12.4792 2.11226 12.3565 2.06544C12.2338 2.01863 12.103 1.99644 11.9717 2.00016C11.8404 2.00387 11.7111 2.03341 11.5912 2.08709C11.4714 2.14077 11.3632 2.21753 11.273 2.313L2.77301 11.313C2.59747 11.4987 2.49966 11.7445 2.49966 12C2.49966 12.2555 2.59747 12.5013 2.77301 12.687L11.273 21.688C11.3626 21.7856 11.4707 21.8643 11.5911 21.9198C11.7114 21.9752 11.8415 22.0062 11.9739 22.0109C12.1063 22.0156 12.2383 21.9939 12.3623 21.9472C12.4863 21.9004 12.5997 21.8295 12.696 21.7386C12.7923 21.6476 12.8696 21.5384 12.9234 21.4173C12.9771 21.2963 13.0063 21.1657 13.0092 21.0333C13.0121 20.9008 12.9886 20.7691 12.9402 20.6458C12.8917 20.5225 12.8193 20.4101 12.727 20.315L4.87501 12L12.727 3.687Z" fill="black"/>
            </svg>
          </button>
        )}
        <a
          href="https://xn--ok0bx6qu3cv5m.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <Image
            src="/logo.png"
            alt="정책자금"
            width={130}
            height={34}
            className={styles.logo}
          />
        </a>
      </header>
      <AnimatePresence mode="wait">
        {/* STEP 1: 이미지 안내 */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={styles.stepWrapper}
          >
       
            <h1 className={styles.title}>2026 소상공인{"\n"}정책자금 신청하기</h1>
            <ul className={styles.featureList}>
              <li className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M2 11.9997C2.0005 9.80727 2.72148 7.67579 4.05199 5.93326C5.38249 4.19074 7.24877 2.93375 9.3636 2.35574C11.4784 1.77774 13.7246 1.91076 15.7565 2.73432C17.7883 3.55789 19.4932 5.02636 20.6087 6.91374C21.7243 8.80111 22.1886 11.0028 21.9304 13.1799C21.6721 15.3571 20.7055 17.389 19.1794 18.963C17.6533 20.537 15.6521 21.5659 13.484 21.8912C11.3159 22.2166 9.10092 21.8204 7.18 20.7637L3.292 21.9477C3.11858 22.0005 2.93407 22.0052 2.75819 21.9612C2.58231 21.9173 2.42168 21.8264 2.2935 21.6982C2.16531 21.57 2.07438 21.4094 2.03043 21.2335C1.98648 21.0576 1.99117 20.8731 2.044 20.6997L3.228 16.8057C2.42153 15.3322 1.9992 13.6794 2 11.9997ZM8 10.9997C8 11.2649 8.10536 11.5192 8.29289 11.7068C8.48043 11.8943 8.73478 11.9997 9 11.9997H15C15.2652 11.9997 15.5196 11.8943 15.7071 11.7068C15.8946 11.5192 16 11.2649 16 10.9997C16 10.7345 15.8946 10.4801 15.7071 10.2926C15.5196 10.105 15.2652 9.99967 15 9.99967H9C8.73478 9.99967 8.48043 10.105 8.29289 10.2926C8.10536 10.4801 8 10.7345 8 10.9997ZM9 13.9997C8.73478 13.9997 8.48043 14.105 8.29289 14.2926C8.10536 14.4801 8 14.7345 8 14.9997C8 15.2649 8.10536 15.5192 8.29289 15.7068C8.48043 15.8943 8.73478 15.9997 9 15.9997H13C13.2652 15.9997 13.5196 15.8943 13.7071 15.7068C13.8946 15.5192 14 15.2649 14 14.9997C14 14.7345 13.8946 14.4801 13.7071 14.2926C13.5196 14.105 13.2652 13.9997 13 13.9997H9Z" fill="#4C85FF"/>
                  </svg>
                </div>
                <p className={styles.featureText}>페이지 내에서 상담 신청</p>
              </li>
              <li className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <mask id="mask0_792_936" style={{maskType: 'luminance'}} maskUnits="userSpaceOnUse" x="3" y="1" width="18" height="22">
                      <path d="M19 1C20.1046 1 21 1.89543 21 3V21C21 22.1046 20.1046 23 19 23H5C3.89543 23 3 22.1046 3 21V3C3 1.89543 3.89543 1 5 1H19ZM7.5 16C7.23478 16 6.98051 16.1054 6.79297 16.293C6.60543 16.4805 6.5 16.7348 6.5 17C6.5 17.2652 6.60543 17.5195 6.79297 17.707C6.98051 17.8946 7.23478 18 7.5 18C7.76522 18 8.0195 17.8946 8.20703 17.707C8.39457 17.5195 8.5 17.2652 8.5 17C8.5 16.7348 8.39457 16.4805 8.20703 16.293C8.0195 16.1054 7.76522 16 7.5 16ZM10.5 16C9.94772 16 9.5 16.4477 9.5 17C9.5 17.5523 9.94772 18 10.5 18H16.5C17.0523 18 17.5 17.5523 17.5 17C17.5 16.4477 17.0523 16 16.5 16H10.5ZM7.5 11C7.23478 11 6.98051 11.1054 6.79297 11.293C6.60543 11.4805 6.5 11.7348 6.5 12C6.5 12.2652 6.60543 12.5195 6.79297 12.707C6.98051 12.8946 7.23478 13 7.5 13C7.76522 13 8.0195 12.8946 8.20703 12.707C8.39457 12.5195 8.5 12.2652 8.5 12C8.5 11.7348 8.39457 11.4805 8.20703 11.293C8.0195 11.1054 7.76522 11 7.5 11ZM10.5 11C9.94772 11 9.5 11.4477 9.5 12C9.5 12.5523 9.94772 13 10.5 13H16.5C17.0523 13 17.5 12.5523 17.5 12C17.5 11.4477 17.0523 11 16.5 11H10.5ZM7.5 6C7.23478 6 6.98051 6.10543 6.79297 6.29297C6.60543 6.4805 6.5 6.73478 6.5 7C6.5 7.26522 6.60543 7.5195 6.79297 7.70703C6.98051 7.89457 7.23478 8 7.5 8C7.76522 8 8.0195 7.89457 8.20703 7.70703C8.39457 7.5195 8.5 7.26522 8.5 7C8.5 6.73478 8.39457 6.4805 8.20703 6.29297C8.0195 6.10543 7.76522 6 7.5 6ZM10.5 6C9.94772 6 9.5 6.44772 9.5 7C9.5 7.55228 9.94772 8 10.5 8H16.5C17.0523 8 17.5 7.55228 17.5 7C17.5 6.44772 17.0523 6 16.5 6H10.5Z" fill="white"/>
                    </mask>
                    <g mask="url(#mask0_792_936)">
                      <path d="M0 0H24V24H0V0Z" fill="#4C85FF"/>
                    </g>
                  </svg>
                </div>
                <p className={styles.featureText}>업종별 맞춤 정책자금 안내</p>
              </li>
              <li className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M10.5 21C10.5 21 9 21 9 19.5C9 18 10.5 13.5 16.5 13.5C22.5 13.5 24 18 24 19.5C24 21 22.5 21 22.5 21H10.5ZM16.5 12C17.6935 12 18.8381 11.5259 19.682 10.682C20.5259 9.83807 21 8.69347 21 7.5C21 6.30653 20.5259 5.16193 19.682 4.31802C18.8381 3.47411 17.6935 3 16.5 3C15.3065 3 14.1619 3.47411 13.318 4.31802C12.4741 5.16193 12 6.30653 12 7.5C12 8.69347 12.4741 9.83807 13.318 10.682C14.1619 11.5259 15.3065 12 16.5 12ZM7.824 21C7.60174 20.5317 7.49084 20.0183 7.5 19.5C7.5 17.4675 8.52 15.375 10.404 13.92C9.46377 13.6297 8.48396 13.4879 7.5 13.5C1.5 13.5 0 18 0 19.5C0 21 1.5 21 1.5 21H7.824ZM6.75 12C7.74456 12 8.69839 11.6049 9.40165 10.9017C10.1049 10.1984 10.5 9.24456 10.5 8.25C10.5 7.25544 10.1049 6.30161 9.40165 5.59835C8.69839 4.89509 7.74456 4.5 6.75 4.5C5.75544 4.5 4.80161 4.89509 4.09835 5.59835C3.39509 6.30161 3 7.25544 3 8.25C3 9.24456 3.39509 10.1984 4.09835 10.9017C4.80161 11.6049 5.75544 12 6.75 12Z" fill="#4C85FF"/>
                  </svg>
                </div>
                <p className={styles.featureText}>심사 지원 및 사후관리</p>
              </li>
            </ul>

            <button className={styles.bottomButton} onClick={() => setStep(2)}>
              다음
            </button>
          </motion.div>
        )}

        {/* STEP 2: 정보 입력 */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={styles.stepWrapper}
          >
            <div className={styles.inputGroup}>
              <h2 className={styles.title}>업종이 어떻게 되시나요?</h2>
              <input
                type="text"
                placeholder="예: 카페, IT 서비스"
                className={styles.inputField}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                autoFocus
              />
            </div>

            {formData.name.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={styles.inputGroup}>
                <label className={styles.inputLabel}>연락처를 입력해주세요</label>
                <input
                  type="tel"
                  placeholder="010-0000-0000"
                  className={styles.inputField}
                  value={formData.contact}
                  onChange={(e) => {
                    const value = e.target.value;
                    const formatted = formatContact(value);
                    setFormData({ ...formData, contact: formatted });
                    validateContact(formatted);
                  }}
                />
                {contactError && (
                  <p className={styles.errorMessage}>{contactError}</p>
                )}
              </motion.div>
            )}

            <button
              className={styles.bottomButton}
              disabled={!isFormValid || loading}
              onClick={handleSubmit}
            >
              {loading ? '처리 중...' : '제출하기'}
            </button>
          </motion.div>
        )}

        {/* STEP 3: 완료 화면 */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={styles.stepWrapper}
            style={{ textAlign: 'center', justifyContent: 'center' }}
          >
            <Image
              src="/complete-check.png"
              alt="Done"
              width={300}
              height={300}
              priority
              style={{ margin: '0 auto 24px' }}
            />
            <h1 className={styles.title}>신청이 완료되었습니다.{"\n"}곧 연락드리겠습니다.</h1>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StepFlowPage() {
  const [clickSource, setClickSource] = useState<string>('baro_form');

  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        </div>
      </div>
    }>
      <ClickSourceHandler onSourceChange={setClickSource} />
      <StepFlowContent clickSource={clickSource} />
    </Suspense>
  );
}