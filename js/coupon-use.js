// 설정
const SUPABASE_URL = 'https://exbzhedywnkkfshantae.supabase.co'; // 여기에 실제 URL 입력
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YnpoZWR5d25ra2ZzaGFudGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NDI1NTMsImV4cCI6MjA5NDQxODU1M30.3x30U1uA8tdykcOpcE5xTP1TqSY0dVtl1nJ1Q9uRoeI'; // 여기에 실제 키 입력
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 전역 변수
let currentCoupon = null;

// DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    loadCoupon();
    setupPwModal();
});

// 직원 비밀번호
const STAFF_PASSWORD = '0000';

function setupPwModal() {
    document.getElementById('pwConfirm').addEventListener('click', submitPw);
    document.getElementById('pwCancel').addEventListener('click', closePwModal);
    document.getElementById('pwInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') submitPw();
    });
    document.getElementById('pwInput').addEventListener('input', function() {
        // 숫자만, 최대 4자리
        this.value = this.value.replace(/\D/g, '').slice(0, 4);
        document.getElementById('pwError').style.display = 'none';
    });
    document.getElementById('pwModal').addEventListener('click', e => {
        if (e.target.id === 'pwModal') closePwModal();
    });
}

function openPwModal() {
    const input = document.getElementById('pwInput');
    input.value = '';
    document.getElementById('pwError').style.display = 'none';
    document.getElementById('pwModal').classList.add('show');
    input.focus();
}

function closePwModal() {
    document.getElementById('pwModal').classList.remove('show');
}

function submitPw() {
    const pw = document.getElementById('pwInput').value;
    if (pw !== STAFF_PASSWORD) {
        document.getElementById('pwError').style.display = 'block';
        return;
    }
    closePwModal();
    processUse();
}

// 쿠폰 정보 로드
async function loadCoupon() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const couponId = urlParams.get('id');

        if (!couponId) {
            showError('쿠폰 ID가 없습니다.');
            return;
        }

        // Supabase에서 쿠폰 정보 조회 (실제 연결 시)
        // const { data, error } = await supabase
        //     .from('coupons')
        //     .select('*')
        //     .eq('id', couponId)
        //     .single();
        const { data, error } = await supabaseClient
            .from('coupons')
            .select('*')
            .eq('id', couponId)
            .single();

        if (error) {
            console.error('쿠폰 조회 에러:', error);
            showError('쿠폰을 찾을 수 없습니다.');
            return;
        }

        const coupon = data;

        // 임시로 로컬 스토리지에서 조회
        // const savedCoupons = localStorage.getItem('cafeCoupons');
        // const coupons = savedCoupons ? JSON.parse(savedCoupons) : [];
        // const coupon = coupons.find(c => c.id === couponId);

        if (!coupon) {
            showError('쿠폰을 찾을 수 없습니다.');
            return;
        }

        currentCoupon = coupon;
        showCoupon(coupon);

    } catch (error) {
        console.error('쿠폰 로드 에러:', error);
        showError('쿠폰 정보를 불러오는 중 오류가 발생했습니다.');
    }
}

// 쿠폰 정보 표시
function showCoupon(coupon) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('couponState').style.display = 'block';

    // 기본 정보 설정
    document.getElementById('discountNumber').textContent = coupon.discount_rate + '%';
    document.getElementById('issuedBy').textContent = coupon.issued_by || '-';
    document.getElementById('friendName').textContent = coupon.friend_name;
    document.getElementById('issuedDate').textContent = formatDateOnly(coupon.created_at);

    // 메모는 관리자 페이지에서만 표시 (사용 링크에는 노출하지 않음)

    // 사용 상태에 따른 UI 업데이트
    if (coupon.is_used) {
        showUsedState(coupon);
    } else {
        showUnusedState();
    }
}

// 미사용 쿠폰 상태
function showUnusedState() {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.innerHTML = `
        <div class="status-message status-success">
            <strong class="status-head">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
                </svg>
                사용 가능한 쿠폰입니다
            </strong>
            아래 버튼은 <strong>직원용</strong>입니다. 사용 시 직원에게 이 화면을 보여주세요.
        </div>
    `;

    const button = document.getElementById('useButton');
    button.className = 'btn btn-use';
    button.textContent = '쿠폰 사용하기';
    button.disabled = false;
    button.onclick = useCoupon;
}

// 사용된 쿠폰 상태
function showUsedState(coupon) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.innerHTML = `
        <div class="status-message status-used">
            <strong>이미 사용된 쿠폰입니다</strong><br>
            다른 쿠폰을 사용해주세요.
        </div>
    `;

    const button = document.getElementById('useButton');
    button.className = 'btn btn-used';
    button.textContent = '사용 완료된 쿠폰';
    button.disabled = true;
    button.onclick = null;

    // 사용 정보 표시
    if (coupon.used_at) {
        document.getElementById('usedDate').textContent = formatDate(coupon.used_at);
        document.getElementById('usedInfo').style.display = 'block';
    }

    // 사용 완료 오버레이
    document.getElementById('usedOverlay').classList.add('show');
}

// 쿠폰 사용하기 클릭 → 직원 비밀번호 모달
function useCoupon() {
    if (!currentCoupon) return;
    openPwModal();
}

// 비밀번호 확인 후 실제 사용 처리
async function processUse() {
    if (!currentCoupon) return;

    const button = document.getElementById('useButton');
    try {
        button.disabled = true;
        button.textContent = '처리 중...';

        const now = new Date().toISOString();
        currentCoupon.is_used = true;
        currentCoupon.used_at = now;

        const { error } = await supabaseClient
            .from('coupons')
            .update({ is_used: true, used_at: now })
            .eq('id', currentCoupon.id);

        if (error) {
            console.error('쿠폰 업데이트 에러:', error);
            alert('쿠폰 사용 처리 중 오류가 발생했습니다.');
            button.disabled = false;
            button.textContent = '쿠폰 사용하기';
            return;
        }

        // 성공 처리 (사용 완료 오버레이 표시)
        showUsedState(currentCoupon);

    } catch (error) {
        console.error('쿠폰 사용 에러:', error);
        alert('쿠폰 사용 처리 중 오류가 발생했습니다.');
        button.disabled = false;
        button.textContent = '쿠폰 사용하기';
    }
}

// 에러 상태 표시
function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
}

// 날짜 포맷팅
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function formatDateOnly(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}
