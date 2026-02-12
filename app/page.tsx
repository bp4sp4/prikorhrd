"use client";

import Image from "next/image";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./stepflow.module.css";

const formatClickSource = (
  utmSource: string,
  materialId: string | null,
  blogId: string | null = null,
  cafeId: string | null = null,
): string => {
  const sourceMap: { [key: string]: string } = {
    daangn: "당근",
    insta: "인스타",
    facebook: "페이스북",
    google: "구글",
    youtube: "유튜브",
    kakao: "카카오",
    naver: "네이버",
    naverblog: "네이버블로그",
    toss: "토스",
    mamcafe: "맘카페",
  };

  const shortSource = sourceMap[utmSource] || utmSource;
  const homepageName = "실습섭외신청";

  if (blogId) {
    return `${homepageName}_${shortSource}_${blogId}`;
  }
  if (cafeId) {
    return `${homepageName}_${shortSource}_${cafeId}`;
  }
  if (materialId) {
    return `${homepageName}_${shortSource}_소재_${materialId}`;
  }
  return `${homepageName}_${shortSource}`;
};

// URL 파라미터를 읽는 컴포넌트
function ClickSourceHandler({
  onSourceChange,
}: {
  onSourceChange: (source: string) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const utmSource = searchParams.get("utm_source");
    const materialId = searchParams.get("material_id");
    const blogId = searchParams.get("blog_id");
    const cafeId = searchParams.get("cafe_id");

    if (utmSource) {
      const formatted = formatClickSource(
        utmSource,
        materialId,
        blogId,
        cafeId,
      );
      onSourceChange(formatted);
    }
  }, [searchParams, onSourceChange]);

  return null;
}

const COURSE_OPTIONS = [
  "사회복지사",
  "아동학사",
  "평생교육사",
  "편입/대학원",
  "건강가정사",
  "청소년지도사",
  "보육교사",
  "심리상담사",
];

function StepFlowContent({ clickSource }: { clickSource: string }) {
  const [step, setStep] = useState(1);
  const [formTab, setFormTab] = useState<"consultation" | "practice">(
    "consultation",
  );
  const [formData, setFormData] = useState({
    name: "", // 성함
    contact: "", // 연락처
    type: "consultation" as "consultation" | "practice", // 상담신청/실습신청서
    // 상담신청 필드
    progress: "", // 진행과정
    employment_consulting: false, // 취업컨설팅
    employment_connection: false, // 취업연계
    student_status: "상담대기", // 학생상태
    // 실습신청서 필드
    practice_place: "", // 실습처 배정
    employment_after_cert: "", // 자격증 취득 후 취업여부
    student_name: "", // 학생 이름
    gender: "", // 성별
    birth_date: "", // 생년월일
    residence_area: "", // 거주지 주소
    address: "", // 상세 주소
    practice_start_date: "", // 현장실습 희망날짜
    grade_report_date: "", // 성적보고일
    preferred_semester: "", // 희망학기
    practice_type: "", // 실습 종류
    preferred_days: "", // 희망 요일
    has_car: false, // 자차 여부
    cash_receipt_number: "", // 현금영수증 번호
    // 레거시 필드 (하위호환성)
    education: "", // 최종학력
    hope_course: "", // 희망과정
    reason: "", // 취득사유
  });
  const [loading, setLoading] = useState(false);
  const [contactError, setContactError] = useState("");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [customCourse, setCustomCourse] = useState("");

  const toggleCourse = (course: string) => {
    setSelectedCourses((prev) =>
      prev.includes(course)
        ? prev.filter((c) => c !== course)
        : [...prev, course],
    );
  };

  const confirmCourseSelection = () => {
    const all = [...selectedCourses];
    if (customCourse.trim()) {
      all.push(customCourse.trim());
    }
    setFormData({ ...formData, hope_course: all.join(", ") });
    setShowCourseModal(false);
  };

  // 연락처 포맷팅 (010-XXXX-XXXX)
  const formatContact = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "");
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
    const cleaned = contact.replace(/[-\s]/g, "");
    if (cleaned.length === 0) {
      setContactError("");
      return true;
    }
    if (!cleaned.startsWith("010") && !cleaned.startsWith("011")) {
      setContactError("010 또는 011로 시작하는 번호를 입력해주세요");
      return false;
    }
    setContactError("");
    return true;
  };

  // 데이터 저장 로직
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const submitData = {
        student_name: formData.student_name,
        gender: formData.gender,
        contact: formData.contact,
        birth_date: formData.birth_date,
        residence_area: formData.residence_area,
        address: formData.address,
        practice_start_date: formData.practice_start_date,
        grade_report_date: formData.grade_report_date,
        preferred_semester: formData.preferred_semester,
        practice_type: formData.practice_type,
        preferred_days: formData.preferred_days,
        has_car: formData.has_car,
        cash_receipt_number: formData.cash_receipt_number || null,
        privacy_agreed: privacyAgreed,
        click_source: clickSource,
        type: "practice",
      };

      const response = await fetch("/api/practice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "저장에 실패했습니다.");
      }

      setStep(3);
    } catch (error) {
      console.error("Error submitting form:", error);
      alert(
        error instanceof Error
          ? error.message
          : "저장에 실패했습니다. 다시 시도해주세요.",
      );
    } finally {
      setLoading(false);
    }
  };

  // 유효성 검사 - 실습신청의 모든 필수 필드 체크
  const isFormValid =
    formData.student_name.length > 0 &&
    formData.gender.length > 0 &&
    formData.contact.replace(/[-\s]/g, "").length >= 10 &&
    !contactError &&
    formData.birth_date.length > 0 &&
    formData.residence_area.length > 0 &&
    formData.address.length > 0 &&
    formData.practice_start_date.length > 0 &&
    formData.grade_report_date.length > 0 &&
    formData.preferred_semester.length > 0 &&
    formData.practice_type.length > 0 &&
    formData.preferred_days.length > 0 &&
    privacyAgreed;

  // 프로그레스 계산 (필수 필드 기준)
  const totalFields = 13; // 학생이름, 성별, 연락처, 생년월일, 거주지주소, 상세주소, 실습희망날짜, 성적보고일, 희망학기, 실습종류, 희망요일, 자차여부, 개인정보동의
  const filledFields = [
    formData.student_name.length > 0,
    formData.gender.length > 0,
    formData.contact.replace(/[-\s]/g, "").length >= 10 && !contactError,
    formData.birth_date.length > 0,
    formData.residence_area.length > 0,
    formData.address.length > 0,
    formData.practice_start_date.length > 0,
    formData.grade_report_date.length > 0,
    formData.preferred_semester.length > 0,
    formData.practice_type.length > 0,
    formData.preferred_days.length > 0,
    typeof formData.has_car === "boolean",
    privacyAgreed,
  ].filter(Boolean).length;
  const progress = (filledFields / totalFields) * 100;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <Image
            src="/logo.png"
            alt="한평생교육"
            width={130}
            height={34}
            className={styles.logo}
          />
        </div>
      </header>
      <AnimatePresence mode="wait">
        {/* STEP 1: 빈 화면 */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={styles.stepWrapper}
          >
            {/* 하단 안내 및 다음 버튼 */}
            <div className={styles.infoSection}>
              <div className={styles.infoInner}>
                <div className={styles.step1Title}>
                  <p className={styles.step1TitleText}>실습섭외신청</p>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.infoTitle}>
                    <div className={styles.infoNumber}>1</div> 실습처 배정
                  </div>
                  <div className={styles.infoDesc}>
                    상담 완료 후 실습처 배정
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.infoTitle}>
                    <div className={styles.infoNumber}>2</div> 취업 컨설팅
                  </div>
                  <div className={styles.infoDesc}>
                    취업 컨설팅 및 취업 연계 지원
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <div className={styles.infoTitle}>
                    <div className={styles.infoNumber}>3</div> 연계 지원
                  </div>
                  <div className={styles.infoDesc}>
                    자격증 취득 후 취업 연계 지원
                  </div>
                </div>
              </div>
              <button
                className={styles.bottomButton + " " + styles.infoNextBtn}
                onClick={() => setStep(2)}
              >
                다음
              </button>
            </div>
          </motion.div>
        )}
        {/* STEP 2: 기존 정보입력 폼 */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={styles.stepWrapper}
          >
            {/* 프로그레스 바 */}
            <div className={styles.progressContainer}>
              <div className={styles.progressBarTrack}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className={styles.progressText}>{Math.round(progress)}%</p>
            </div>

            <div className={styles.step2Title}>
              <h1 className={styles.step2TitleText}>실습 신청</h1>
            </div>

            {/* 학생 이름 */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>학생 이름</label>
              <input
                type="text"
                placeholder="학생 이름을 입력해주세요"
                className={styles.inputField}
                value={formData.student_name}
                onChange={(e) =>
                  setFormData({ ...formData, student_name: e.target.value })
                }
                autoFocus
              />
            </div>

            {/* 성별 */}
            {formData.student_name.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.inputGroup}
              >
                <label className={styles.inputLabel}>성별</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="gender"
                      value="남"
                      checked={formData.gender === "남"}
                      onChange={(e) =>
                        setFormData({ ...formData, gender: e.target.value })
                      }
                      className={styles.radio}
                    />
                    <span>남</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="gender"
                      value="여"
                      checked={formData.gender === "여"}
                      onChange={(e) =>
                        setFormData({ ...formData, gender: e.target.value })
                      }
                      className={styles.radio}
                    />
                    <span>여</span>
                  </label>
                </div>
              </motion.div>
            )}

            {/* 연락처 */}
            {formData.gender && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.inputGroup}
              >
                <label className={styles.inputLabel}>연락처</label>
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

            {/* 생년월일 */}
            {formData.contact.replace(/[-\s]/g, "").length >= 10 &&
              !contactError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.inputGroup}
                >
                  <label className={styles.inputLabel}>생년월일</label>
                  <input
                    type="date"
                    className={styles.inputField}
                    value={formData.birth_date}
                    onChange={(e) =>
                      setFormData({ ...formData, birth_date: e.target.value })
                    }
                  />
                </motion.div>
              )}

            {/* 거주지 주소 */}
            {formData.birth_date && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.inputGroup}
              >
                <label className={styles.inputLabel}>거주지 주소</label>
                <input
                  type="text"
                  placeholder="예: 서울, 경기도, 부산 등"
                  className={styles.inputField}
                  value={formData.residence_area}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      residence_area: e.target.value,
                    })
                  }
                />
              </motion.div>
            )}

            {/* 상세 주소 */}
            {formData.residence_area && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.inputGroup}
              >
                <label className={styles.inputLabel}>상세 주소</label>
                <input
                  type="text"
                  placeholder="상세 주소를 입력해주세요"
                  className={styles.inputField}
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </motion.div>
            )}

            {/* 현장실습 희망날짜 */}
            {formData.address && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.inputGroup}
              >
                <label className={styles.inputLabel}>현장실습 희망날짜</label>
                <input
                  type="date"
                  className={styles.inputField}
                  value={formData.practice_start_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      practice_start_date: e.target.value,
                    })
                  }
                />
              </motion.div>
            )}

            {/* 성적보고일 */}
            {formData.practice_start_date && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.inputGroup}
              >
                <label className={styles.inputLabel}>성적보고일</label>
                <input
                  type="date"
                  className={styles.inputField}
                  value={formData.grade_report_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      grade_report_date: e.target.value,
                    })
                  }
                />
              </motion.div>
            )}

            {/* 희망학기 */}
            {formData.grade_report_date && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.inputGroup}
              >
                <label className={styles.inputLabel}>희망학기</label>
                <input
                  type="text"
                  placeholder="예: 2024-1학기"
                  className={styles.inputField}
                  value={formData.preferred_semester}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preferred_semester: e.target.value,
                    })
                  }
                />
              </motion.div>
            )}

            {/* 실습 종류 */}
            {formData.preferred_semester && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.inputGroup}
              >
                <label className={styles.inputLabel}>실습 종류</label>
                <select
                  className={styles.inputField}
                  value={formData.practice_type}
                  onChange={(e) =>
                    setFormData({ ...formData, practice_type: e.target.value })
                  }
                >
                  <option value="">선택해주세요</option>
                  <option value="사회복지사 실습 160시간">
                    사회복지사 실습 160시간
                  </option>
                  <option value="사회복지사 실습 120시간">
                    사회복지사 실습 120시간
                  </option>
                  <option value="보육교사 실습 240시간">
                    보육교사 실습 240시간
                  </option>
                  <option value="평생교육사 실습 160시간">
                    평생교육사 실습 160시간
                  </option>
                  <option value="한국어교원 실습">한국어교원 실습</option>
                </select>
              </motion.div>
            )}

            {/* 희망 요일 */}
            {formData.practice_type && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.inputGroup}
              >
                <label className={styles.inputLabel}>희망 요일</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="preferred_days"
                      value="주말"
                      checked={formData.preferred_days === "주말"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          preferred_days: e.target.value,
                        })
                      }
                      className={styles.radio}
                    />
                    <span>주말</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="preferred_days"
                      value="평일"
                      checked={formData.preferred_days === "평일"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          preferred_days: e.target.value,
                        })
                      }
                      className={styles.radio}
                    />
                    <span>평일</span>
                  </label>
                </div>
              </motion.div>
            )}

            {/* 자차 여부 */}
            {formData.preferred_days && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.inputGroup}
              >
                <label className={styles.inputLabel}>자차 여부</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="has_car"
                      value="true"
                      checked={formData.has_car === true}
                      onChange={() =>
                        setFormData({ ...formData, has_car: true })
                      }
                      className={styles.radio}
                    />
                    <span>있음</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="has_car"
                      value="false"
                      checked={formData.has_car === false}
                      onChange={() =>
                        setFormData({ ...formData, has_car: false })
                      }
                      className={styles.radio}
                    />
                    <span>없음</span>
                  </label>
                </div>
              </motion.div>
            )}

            {/* 현금영수증 번호 */}
            {formData.preferred_days && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.inputGroup}
              >
                <label className={styles.inputLabel}>
                  현금영수증 번호 (선택)
                </label>
                <input
                  type="text"
                  placeholder="현금영수증 번호를 입력해주세요"
                  className={styles.inputField}
                  value={formData.cash_receipt_number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cash_receipt_number: e.target.value,
                    })
                  }
                />
              </motion.div>
            )}

            {/* 개인정보처리방침 동의 */}
            {formData.preferred_days && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.inputGroup}
              >
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={privacyAgreed}
                    onChange={(e) => setPrivacyAgreed(e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowPrivacyModal(true);
                      }}
                      className={styles.privacyLink}
                    >
                      개인정보처리방침
                    </button>{" "}
                    동의
                  </span>
                </label>
              </motion.div>
            )}

            <button
              className={styles.bottomButton}
              disabled={!isFormValid || loading}
              onClick={handleSubmit}
            >
              {loading ? "처리 중..." : "제출하기"}
            </button>
          </motion.div>
        )}
        {/* STEP 3: 완료 화면 */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`${styles.stepWrapper} ${styles.step3Container}`}
          >
            <Image
              src="/complete-check.png"
              alt="Done"
              width={300}
              height={300}
              priority
              className={styles.step3Image}
            />
            <h1 className={styles.title}>
              신청이 완료되었습니다.{"\n"}곧 연락드리겠습니다.
            </h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 개인정보처리방침 모달 */}
      {showPrivacyModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowPrivacyModal(false)}
        >
          <div
            className={styles.modalPrivacy}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalPrivacyHeader}>
              <h3 className={styles.modalPrivacyTitle}>개인정보처리방침</h3>
              <button
                className={styles.modalCloseButton}
                onClick={() => setShowPrivacyModal(false)}
                aria-label="닫기"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <div className={styles.modalPrivacyContent}>
              <div className={styles.modalPrivacyScroll}>
                <p className={styles.modalPrivacyItem}>
                  <strong>1. 개인정보 수집 및 이용 목적</strong>
                  <br />
                  사회복지사 자격 취득 상담 진행, 문의사항 응대
                  <br />
                  개인정보는 상담 서비스 제공을 위한 목적으로만 수집 및
                  이용되며, 동의 없이 제3자에게 제공되지 않습니다
                </p>
                <p className={styles.modalPrivacyItem}>
                  <strong>2. 수집 및 이용하는 개인정보 항목</strong>
                  <br />
                  필수 - 이름, 연락처, 자격증 취득 후 취업여부
                </p>
                <p className={styles.modalPrivacyItem}>
                  <strong>3. 보유 및 이용 기간</strong>
                  <br />
                  법령이 정하는 경우를 제외하고는 수집일로부터 1년 또는 동의
                  철회 시까지 보유 및 이용합니다.
                </p>
                <p className={styles.modalPrivacyItem}>
                  <strong>4. 동의 거부 권리</strong>
                  <br />
                  신청자는 동의를 거부할 권리가 있습니다. 단, 동의를 거부하는
                  경우 상담 서비스 이용이 제한됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 희망과정 선택 모달 */}
      {showCourseModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowCourseModal(false)}
        >
          <div
            className={styles.modalPrivacy}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalPrivacyHeader}>
              <h3 className={styles.modalPrivacyTitle}>희망과정 선택</h3>
              <button
                className={styles.modalCloseButton}
                onClick={() => setShowCourseModal(false)}
                aria-label="닫기"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <div className={styles.courseModalContent}>
              <p className={styles.courseModalDesc}>복수 선택이 가능합니다</p>
              <div className={styles.courseList}>
                {COURSE_OPTIONS.map((course) => (
                  <button
                    key={course}
                    className={`${styles.courseItem} ${selectedCourses.includes(course) ? styles.courseItemSelected : ""}`}
                    onClick={() => toggleCourse(course)}
                  >
                    <span>{course}</span>
                    {selectedCourses.includes(course) && (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M4 10L8 14L16 6"
                          stroke="#4C85FF"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <div className={styles.customCourseWrapper}>
                <label className={styles.customCourseLabel}>직접 입력</label>
                <input
                  type="text"
                  className={styles.customCourseInput}
                  placeholder="원하는 과정을 직접 입력해주세요"
                  value={customCourse}
                  onChange={(e) => setCustomCourse(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.courseModalFooter}>
              <button
                className={styles.courseConfirmButton}
                disabled={selectedCourses.length === 0 && !customCourse.trim()}
                onClick={confirmCourseSelection}
              >
                {selectedCourses.length > 0 || customCourse.trim()
                  ? "선택 완료"
                  : "과정을 선택해주세요"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StepFlowPage() {
  const [clickSource, setClickSource] = useState<string>("실습섭외신청");

  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <div className={styles.loadingContainer}>
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-gray-600">로딩 중...</p>
            </div>
          </div>
        </div>
      }
    >
      <ClickSourceHandler onSourceChange={setClickSource} />
      <StepFlowContent clickSource={clickSource} />
    </Suspense>
  );
}
