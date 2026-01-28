'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './admin.module.css';

type ConsultationStatus = '상담대기중' | '상담중' | '상담완료' | '등록완료';

interface Consultation {
  id: number;
  name: string;
  contact: string;
  education: string;
  reason: string;
  click_source: string | null;
  memo: string | null;
  status: ConsultationStatus;
  subject_cost: number | null;
  manager: string | null;
  created_at: string;
}

export default function AdminPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSubjectCostModal, setShowSubjectCostModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [memoText, setMemoText] = useState('');
  const [subjectCostText, setSubjectCostText] = useState('');
  const [managerText, setManagerText] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  // 필터 상태
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConsultationStatus | 'all'>('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    education: '',
    reason: '',
    click_source: '',
    subject_cost: '',
    manager: ''
  });
  const router = useRouter();

  // 인증 상태 확인
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      fetchConsultations();
    } else {
      router.push('/admin/login');
    }
  };

  // 로그아웃
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  // 상담 신청 목록 가져오기
  const fetchConsultations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // status가 없는 데이터에 기본값 설정
      const consultationsWithStatus = (data || []).map(item => ({
        ...item,
        status: item.status || '상담대기중'
      }));

      setConsultations(consultationsWithStatus);
    } catch (error: any) {
      setError(error.message || '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // 상담 신청 추가
  const handleAddConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          is_manual_entry: true, // 수동 추가 플래그
        }),
      });

      if (!response.ok) throw new Error('추가 실패');

      // 폼 초기화 및 목록 새로고침
      setFormData({
        name: '',
        contact: '',
        education: '',
        reason: '',
        click_source: '',
        subject_cost: '',
        manager: ''
      });
      setShowAddModal(false);
      fetchConsultations();
    } catch (error) {
      alert('상담 신청 추가에 실패했습니다.');
    }
  };

  // 메모 수정
  const handleUpdateMemo = async () => {
    if (!selectedConsultation) return;
    
    try {
      const response = await fetch('/api/consultations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: selectedConsultation.id, memo: memoText }),
      });

      if (!response.ok) throw new Error('메모 업데이트 실패');

      setShowMemoModal(false);
      setSelectedConsultation(null);
      setMemoText('');
      fetchConsultations();
    } catch (error) {
      alert('메모 저장에 실패했습니다.');
    }
  };

  const openMemoModal = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setMemoText(consultation.memo || '');
    setShowMemoModal(true);
  };

  const closeMemoModal = () => {
    setShowMemoModal(false);
    setSelectedConsultation(null);
    setMemoText('');
  };

  // 과목비용 모달 열기/닫기
  const openSubjectCostModal = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setSubjectCostText(consultation.subject_cost ? consultation.subject_cost.toLocaleString() : '');
    setShowSubjectCostModal(true);
  };

  const closeSubjectCostModal = () => {
    setShowSubjectCostModal(false);
    setSelectedConsultation(null);
    setSubjectCostText('');
  };

  // 과목비용 업데이트
  const handleUpdateSubjectCost = async () => {
    if (!selectedConsultation) return;
    
    try {
      const numericValue = subjectCostText.replace(/,/g, '');
      const response = await fetch('/api/consultations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: selectedConsultation.id, 
          subject_cost: numericValue ? parseInt(numericValue) : null 
        }),
      });

      if (!response.ok) throw new Error('과목비용 업데이트 실패');

      closeSubjectCostModal();
      fetchConsultations();
    } catch (error) {
      alert('과목비용 저장에 실패했습니다.');
    }
  };

  // 담당자 모달 열기/닫기
  const openManagerModal = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setManagerText(consultation.manager || '');
    setShowManagerModal(true);
  };

  const closeManagerModal = () => {
    setShowManagerModal(false);
    setSelectedConsultation(null);
    setManagerText('');
  };

  // 담당자 업데이트
  const handleUpdateManager = async () => {
    if (!selectedConsultation) return;
    
    try {
      const response = await fetch('/api/consultations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: selectedConsultation.id, 
          manager: managerText || null 
        }),
      });

      if (!response.ok) throw new Error('담당자 업데이트 실패');

      closeManagerModal();
      fetchConsultations();
    } catch (error) {
      alert('담당자 저장에 실패했습니다.');
    }
  };

  // 전화번호 자동 포맷팅
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    if (numbers.length <= 11) return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, contact: formatted });
  };

  // 과목비용 포맷팅 (콤마 추가)
  const formatSubjectCost = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (!numbers) return '';
    return parseInt(numbers).toLocaleString();
  };

  const handleSubjectCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSubjectCost(e.target.value);
    setSubjectCostText(formatted);
  };

  const handleFormSubjectCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSubjectCost(e.target.value);
    setFormData({ ...formData, subject_cost: formatted });
  };

  // 수정 모달 열기
  const openEditModal = () => {
    if (selectedIds.length !== 1) {
      alert('수정할 항목을 1개만 선택해주세요.');
      return;
    }
    const consultation = consultations.find(c => c.id === selectedIds[0]);
    if (consultation) {
      setSelectedConsultation(consultation);
      setFormData({
        name: consultation.name,
        contact: consultation.contact,
        education: consultation.education || '',
        reason: consultation.reason || '',
        click_source: consultation.click_source || '',
        subject_cost: consultation.subject_cost ? consultation.subject_cost.toLocaleString() : '',
        manager: consultation.manager || ''
      });
      setShowEditModal(true);
    }
  };

  // 수정 저장
  const handleEditConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsultation) return;

    try {
      const response = await fetch('/api/consultations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedConsultation.id,
          name: formData.name,
          contact: formData.contact,
          education: formData.education || null,
          reason: formData.reason || null,
          click_source: formData.click_source || null,
          subject_cost: formData.subject_cost ? parseInt(formData.subject_cost.replace(/,/g, '')) : null,
          manager: formData.manager || null,
        }),
      });

      if (!response.ok) throw new Error('수정 실패');

      setFormData({
        name: '',
        contact: '',
        education: '',
        reason: '',
        click_source: '',
        subject_cost: '',
        manager: ''
      });
      setShowEditModal(false);
      setSelectedConsultation(null);
      setSelectedIds([]);
      fetchConsultations();
    } catch (error) {
      alert('상담 신청 수정에 실패했습니다.');
    }
  };

  // 개별 상태 변경
  const handleStatusChange = async (id: number, newStatus: ConsultationStatus) => {
    try {
      const response = await fetch('/api/consultations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (!response.ok) throw new Error('상태 업데이트 실패');

      fetchConsultations();
    } catch (error) {
      alert('상태 변경에 실패했습니다.');
    }
  };

  // 체크박스 관련 함수
  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedConsultations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedConsultations.map(c => c.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      alert('삭제할 항목을 선택해주세요.');
      return;
    }

    if (!confirm(`선택한 ${selectedIds.length}개의 항목을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch('/api/consultations', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) throw new Error('삭제 실패');

      setSelectedIds([]);
      fetchConsultations();
    } catch (error) {
      alert('삭제에 실패했습니다.');
    }
  };

  // 필터링
  const filteredConsultations = consultations.filter(consultation => {
    // 검색 텍스트 필터 (이름, 연락처, 취득사유, 메모)
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      const matchesSearch = 
        consultation.name.toLowerCase().includes(searchLower) ||
        consultation.contact.toLowerCase().includes(searchLower) ||
        (consultation.reason && consultation.reason.toLowerCase().includes(searchLower)) ||
        (consultation.memo && consultation.memo.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }
    
    // 상태 필터
    if (statusFilter !== 'all' && consultation.status !== statusFilter) {
      return false;
    }
    
    // 담당자 필터
    if (managerFilter !== 'all') {
      if (managerFilter === 'none' && consultation.manager) return false;
      if (managerFilter !== 'none' && consultation.manager !== managerFilter) return false;
    }
    
    // 날짜 필터
    if (startDate || endDate) {
      const consultationDate = new Date(consultation.created_at);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (consultationDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (consultationDate > end) return false;
      }
    }
    
    return true;
  });

  // 페이징 계산 (필터링된 데이터 기준)
  const totalPages = Math.ceil(filteredConsultations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedConsultations = filteredConsultations.slice(startIndex, endIndex);

  // 고유 담당자 목록
  const uniqueManagers = Array.from(new Set(consultations.map(c => c.manager).filter(Boolean))) as string[];

  const goToPage = (page: number) => {
    setCurrentPage(page);
    setSelectedIds([]);
  };

  // 검색어 하이라이트 함수
  const highlightText = (text: string | null | undefined, query: string) => {
    if (!text || !query) return text || '';
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <span key={index} className={styles.highlight}>{part}</span>
        : part
    );
  };

  // 엑셀 다운로드 함수
  const handleExcelDownload = () => {
    // 선택된 항목이 있으면 선택된 것만, 없으면 필터링된 전체 다운로드
    const dataToDownload = selectedIds.length > 0 
      ? consultations.filter(c => selectedIds.includes(c.id))
      : filteredConsultations;

    if (dataToDownload.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    // CSV 형식으로 다운로드
    const headers = ['이름', '연락처', '최종학력', '취득사유', '유입 경로', '과목비용', '담당자', '메모', '신청일시', '상태'];
    const csvData = dataToDownload.map(consultation => [
      consultation.name,
      consultation.contact,
      consultation.education || '',
      consultation.reason || '',
      consultation.click_source || '',
      consultation.subject_cost || '',
      consultation.manager || '',
      consultation.memo || '',
      formatDate(consultation.created_at),
      consultation.status || '상담대기중'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // UTF-8 BOM 추가 (엑셀에서 한글 깨짐 방지)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const fileName = selectedIds.length > 0 
      ? `상담신청_선택${selectedIds.length}건_${new Date().toISOString().split('T')[0]}.csv`
      : `상담신청_${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 관리자 대시보드
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>상담 신청 관리 ({filteredConsultations.length}건)</h1>
        
        {/* 필터 영역 */}
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <input
              type="text"
              placeholder="이름, 연락처, 취득사유, 메모 검색..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filterGroup}>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as ConsultationStatus | 'all');
                setCurrentPage(1);
              }}
              className={styles.filterSelect}
            >
              <option value="all">전체 상태</option>
              <option value="상담대기중">상담대기중</option>
              <option value="상담중">상담중</option>
              <option value="상담완료">상담완료</option>
              <option value="등록완료">등록완료</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <select
              value={managerFilter}
              onChange={(e) => {
                setManagerFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.filterSelect}
            >
              <option value="all">전체 담당자</option>
              <option value="none">담당자 없음</option>
              {uniqueManagers.map(manager => (
                <option key={manager} value={manager}>{manager}</option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.dateInput}
              placeholder="시작일"
            />
          </div>
          <div className={styles.filterGroup}>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.dateInput}
              placeholder="종료일"
            />
          </div>
          {(searchText || statusFilter !== 'all' || managerFilter !== 'all' || startDate || endDate) && (
            <button 
              onClick={() => {
                setSearchText('');
                setStatusFilter('all');
                setManagerFilter('all');
                setStartDate('');
                setEndDate('');
                setCurrentPage(1);
              }}
              className={styles.clearFilterButton}
            >
              필터 초기화
            </button>
          )}
        </div>

        <div className={styles.headerActions}>
          <button onClick={() => setShowAddModal(true)} className={styles.addButton}>
            추가
          </button>
          {selectedIds.length === 1 && (
            <button onClick={openEditModal} className={styles.editButton}>
              수정
            </button>
          )}
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} className={styles.deleteButton}>
              삭제 ({selectedIds.length})
            </button>
          )}
          <button onClick={handleExcelDownload} className={styles.excelButton}>
            {selectedIds.length > 0 ? `선택 항목 다운로드 (${selectedIds.length})` : '엑셀 다운로드'}
          </button>
          <button onClick={fetchConsultations} className={styles.refreshButton}>
            새로고침
          </button>
          <button onClick={handleLogout} className={styles.logoutButton}>
            로그아웃
          </button>
        </div>
      </header>

      {loading ? (
        <div className={styles.loading}>로딩 중...</div>
      ) : error ? (
        <div className={styles.errorMessage}>{error}</div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkboxCell}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === paginatedConsultations.length && paginatedConsultations.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>이름</th>
                <th>연락처</th>
                <th>최종학력</th>
                <th>취득사유</th>
                <th>유입 경로</th>
                <th>과목비용</th>
                <th>담당자</th>
                <th>메모</th>
                <th>신청일시</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {paginatedConsultations.length === 0 ? (
                <tr>
                  <td colSpan={11} className={styles.empty}>
                    신청 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedConsultations.map((consultation) => (
                  <tr key={consultation.id} className={selectedIds.includes(consultation.id) ? styles.selectedRow : ''}>
                    <td className={styles.checkboxCell}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(consultation.id)}
                        onChange={() => toggleSelect(consultation.id)}
                      />
                    </td>
                    <td>{highlightText(consultation.name, searchText)}</td>
                    <td>{highlightText(consultation.contact, searchText)}</td>
                    <td>{consultation.education || '-'}</td>
                    <td className={styles.reasonCell}>{highlightText(consultation.reason, searchText)}</td>
                    <td>{consultation.click_source || '-'}</td>
                    <td>
                      <div 
                        className={`${styles.memoCell} ${!consultation.subject_cost ? styles.empty : ''}`}
                        onClick={() => openSubjectCostModal(consultation)}
                      >
                        {consultation.subject_cost ? consultation.subject_cost.toLocaleString() + '원' : '비용 입력...'}
                      </div>
                    </td>
                    <td>
                      <div 
                        className={`${styles.memoCell} ${!consultation.manager ? styles.empty : ''}`}
                        onClick={() => openManagerModal(consultation)}
                      >
                        {consultation.manager ? highlightText(consultation.manager, searchText) : '담당자 입력...'}
                      </div>
                    </td>
                    <td>
                      <div 
                        className={`${styles.memoCell} ${!consultation.memo ? styles.empty : ''}`}
                        onClick={() => openMemoModal(consultation)}
                        title={consultation.memo || '메모 추가...'}
                      >
                        {consultation.memo || '메모 추가...'}
                      </div>
                    </td>
                    <td>{formatDate(consultation.created_at)}</td>
                    <td>
                      <select
                        value={consultation.status || '상담대기중'}
                        onChange={(e) => handleStatusChange(consultation.id, e.target.value as ConsultationStatus)}
                        className={`${styles.statusSelect} ${styles[`status${(consultation.status || '상담대기중').replace(/\s/g, '')}`]}`}
                      >
                        <option value="상담대기중">상담대기중</option>
                        <option value="상담중">상담중</option>
                        <option value="상담완료">상담완료</option>
                        <option value="등록완료">등록완료</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* 페이징 */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={styles.pageButton}
              >
                이전
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`${styles.pageButton} ${currentPage === page ? styles.activePage : ''}`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={styles.pageButton}
              >
                다음
              </button>
            </div>
          )}
        </div>
      )}

      {/* 수동 추가 모달 */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>상담 신청 추가</h2>
            <form onSubmit={handleAddConsultation} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>이름 *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="이름을 입력하세요"
                />
              </div>
              <div className={styles.formGroup}>
                <label>연락처 *</label>
                <input
                  type="text"
                  required
                  value={formData.contact}
                  onChange={handleContactChange}
                  placeholder="010-1234-5678"
                  maxLength={13}
                />
              </div>
              <div className={styles.formGroup}>
                <label>최종학력</label>
                <select
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                >
                  <option value="">선택하세요 (선택사항)</option>
                  <option value="고등학교 졸업">고등학교 졸업</option>
                  <option value="대학교 재학">대학교 재학</option>
                  <option value="대학교 졸업">대학교 졸업</option>
                  <option value="대학원 이상">대학원 이상</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>취득사유</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  placeholder="취득사유를 입력하세요 (선택사항)"
                />
              </div>
              <div className={styles.formGroup}>
                <label>유입 경로</label>
                <input
                  type="text"
                  value={formData.click_source}
                  onChange={(e) => setFormData({ ...formData, click_source: e.target.value })}
                  placeholder="예: naver, google 등 (선택사항)"
                />
              </div>
              <div className={styles.formGroup}>
                <label>과목비용</label>
                <input
                  type="text"
                  value={formData.subject_cost}
                  onChange={handleFormSubjectCostChange}
                  placeholder="숫자만 입력 (선택사항)"
                />
              </div>
              <div className={styles.formGroup}>
                <label>담당자</label>
                <input
                  type="text"
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  placeholder="담당자 이름 (선택사항)"
                />
              </div>
              <div className={styles.modalActions}>
                <button type="submit" className={styles.submitButton}>추가하기</button>
                <button type="button" onClick={() => setShowAddModal(false)} className={styles.cancelButton}>
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {showEditModal && selectedConsultation && (
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>상담 신청 수정</h2>
            <form onSubmit={handleEditConsultation} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>이름 *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="이름을 입력하세요"
                />
              </div>
              <div className={styles.formGroup}>
                <label>연락처 *</label>
                <input
                  type="text"
                  required
                  value={formData.contact}
                  onChange={handleContactChange}
                  placeholder="010-1234-5678"
                  maxLength={13}
                />
              </div>
              <div className={styles.formGroup}>
                <label>최종학력</label>
                <select
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                >
                  <option value="">선택하세요 (선택사항)</option>
                  <option value="고등학교 졸업">고등학교 졸업</option>
                  <option value="대학교 재학">대학교 재학</option>
                  <option value="대학교 졸업">대학교 졸업</option>
                  <option value="대학원 이상">대학원 이상</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>취득사유</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  placeholder="취득사유를 입력하세요 (선택사항)"
                />
              </div>
              <div className={styles.formGroup}>
                <label>유입 경로</label>
                <input
                  type="text"
                  value={formData.click_source}
                  onChange={(e) => setFormData({ ...formData, click_source: e.target.value })}
                  placeholder="예: naver, google 등 (선택사항)"
                />
              </div>
              <div className={styles.formGroup}>
                <label>과목비용</label>
                <input
                  type="text"
                  value={formData.subject_cost}
                  onChange={handleFormSubjectCostChange}
                  placeholder="숫자만 입력 (선택사항)"
                />
              </div>
              <div className={styles.formGroup}>
                <label>담당자</label>
                <input
                  type="text"
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  placeholder="담당자 이름 (선택사항)"
                />
              </div>
              <div className={styles.modalActions}>
                <button type="submit" className={styles.submitButton}>수정하기</button>
                <button type="button" onClick={() => setShowEditModal(false)} className={styles.cancelButton}>
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 메모 편집 모달 */}
      {showMemoModal && selectedConsultation && (
        <div className={styles.modalOverlay} onClick={closeMemoModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>메모 편집</h2>
            <div className={styles.memoInfo}>
              <p><strong>이름:</strong> {selectedConsultation.name}</p>
              <p><strong>연락처:</strong> {selectedConsultation.contact}</p>
            </div>
            <div className={styles.formGroup}>
              <label>메모</label>
              <textarea
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                rows={5}
                placeholder="메모를 입력하세요..."
                className={styles.memoTextarea}
              />
            </div>
            <div className={styles.modalActions}>
              <button onClick={handleUpdateMemo} className={styles.submitButton}>
                저장
              </button>
              <button onClick={closeMemoModal} className={styles.cancelButton}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 과목비용 편집 모달 */}
      {showSubjectCostModal && selectedConsultation && (
        <div className={styles.modalOverlay} onClick={closeSubjectCostModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>과목비용 편집</h2>
            <div className={styles.memoInfo}>
              <p><strong>이름:</strong> {selectedConsultation.name}</p>
              <p><strong>연락처:</strong> {selectedConsultation.contact}</p>
            </div>
            <div className={styles.formGroup}>
              <label>과목비용</label>
              <input
                type="text"
                value={subjectCostText}
                onChange={handleSubjectCostChange}
                placeholder="숫자만 입력하세요..."
              />
            </div>
            <div className={styles.modalActions}>
              <button onClick={handleUpdateSubjectCost} className={styles.submitButton}>
                저장
              </button>
              <button onClick={closeSubjectCostModal} className={styles.cancelButton}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 담당자 편집 모달 */}
      {showManagerModal && selectedConsultation && (
        <div className={styles.modalOverlay} onClick={closeManagerModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>담당자 편집</h2>
            <div className={styles.memoInfo}>
              <p><strong>이름:</strong> {selectedConsultation.name}</p>
              <p><strong>연락처:</strong> {selectedConsultation.contact}</p>
            </div>
            <div className={styles.formGroup}>
              <label>담당자</label>
              <input
                type="text"
                value={managerText}
                onChange={(e) => setManagerText(e.target.value)}
                placeholder="담당자 이름을 입력하세요..."
              />
            </div>
            <div className={styles.modalActions}>
              <button onClick={handleUpdateManager} className={styles.submitButton}>
                저장
              </button>
              <button onClick={closeManagerModal} className={styles.cancelButton}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
