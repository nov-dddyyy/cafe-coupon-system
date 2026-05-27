// 설정
const SUPABASE_URL = 'https://exbzhedywnkkfshantae.supabase.co'; // 여기에 실제 URL 입력
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YnpoZWR5d25ra2ZzaGFudGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NDI1NTMsImV4cCI6MjA5NDQxODU1M30.3x30U1uA8tdykcOpcE5xTP1TqSY0dVtl1nJ1Q9uRoeI'; // 여기에 실제 키 입력
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 전역 변수
let currentCoupon = null;

// DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    loadCoupon();
});

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
    document.getElementById('friendName').textContent = coupon.friend_name;
    document.getElementById('issuedDate').textContent = formatDate(coupon.created_at);
    document.getElementById('couponId').textContent = coupon.id;

    // 메모 표시
    if (coupon.memo) {
        document.getElementById('memo').textContent = coupon.memo;
        document.getElementById('memoRow').style.display = 'flex';
    }

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
            <strong>✓ 사용 가능한 쿠폰입니다</strong><br>
            아래 버튼을 눌러 쿠폰을 사용 처리하세요.
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

// 쿠폰 사용 처리
async function useCoupon() {
    if (!currentCoupon) return;

    try {
        // 확인 대화상자
        if (!confirm(`${currentCoupon.friend_name}님의 ${currentCoupon.discount_rate}% 할인 쿠폰을 사용하시겠습니까?`)) {
            return;
        }

        // 버튼 비활성화
        const button = document.getElementById('useButton');
        button.disabled = true;
        button.textContent = '처리 중...';

        // 사용 시간 설정
        const now = new Date().toISOString();
        currentCoupon.is_used = true;
        currentCoupon.used_at = now;

        // Supabase 업데이트 (실제 연결 시)
        // const { data, error } = await supabase
        //     .from('coupons')
        //     .update({ is_used: true, used_at: now })
        //     .eq('id', currentCoupon.id);
        const { data, error } = await supabaseClient
            .from('coupons')
            .update({ is_used: true, used_at: now })
            .eq('id', currentCoupon.id);

        if (error) {
            console.error('쿠폰 업데이트 에러:', error);
            alert('쿠폰 사용 처리 중 오류가 발생했습니다.');
            return;
        }

        // 임시로 로컬 스토리지 업데이트
        // const savedCoupons = localStorage.getItem('cafeCoupons');
        // const coupons = savedCoupons ? JSON.parse(savedCoupons) : [];
        // const index = coupons.findIndex(c => c.id === currentCoupon.id);
        // if (index !== -1) {
        //     coupons[index] = currentCoupon;
        //     localStorage.setItem('cafeCoupons', JSON.stringify(coupons));
        // }

        // 성공 처리
        showUsedState(currentCoupon);

        // 성공 알림
        setTimeout(() => {
            alert(`쿠폰이 성공적으로 사용되었습니다!\n\n할인율: ${currentCoupon.discount_rate}%\n고객: ${currentCoupon.friend_name}`);
        }, 500);

    } catch (error) {
        console.error('쿠폰 사용 에러:', error);
        alert('쿠폰 사용 처리 중 오류가 발생했습니다.');

        // 버튼 복원
        const button = document.getElementById('useButton');
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
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
