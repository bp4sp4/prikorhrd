'use client';

import Image from 'next/image';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './stepflow.module.css';

export default function StepFlowPage() {
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
          click_source: 'baro_form',
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
        <Image
          src="/logo.png"
          alt="정책자금"
          width={130}
          height={34}
          className={styles.logo}
        />
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
            <Image
              src="/hero-image.png"
              alt="Guide"
              className={styles.heroImage}
              width={800}
              height={600}
              priority
            />
            <h1 className={styles.title}>서비스 신청을{"\n"}시작해볼까요?</h1>
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
              width={80}
              height={80}
              style={{ margin: '0 auto 24px' }}
            />
            <h1 className={styles.title}>신청이 완료되었습니다.{"\n"}곧 연락드리겠습니다.</h1>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}