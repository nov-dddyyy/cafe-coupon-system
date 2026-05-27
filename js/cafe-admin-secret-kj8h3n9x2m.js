// 설정
const SUPABASE_URL = 'https://exbzhedywnkkfshantae.supabase.co'; // 여기에 실제 URL 입력
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YnpoZWR5d25ra2ZzaGFudGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NDI1NTMsImV4cCI6MjA5NDQxODU1M30.3x30U1uA8tdykcOpcE5xTP1TqSY0dVtl1nJ1Q9uRoeI'; // 여기에 실제 키 입력
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 전역 변수
let selectedDiscount = 0;
let selectedIssuer = '';
let coupons = [];

// 목록 검색/필터/페이지네이션 상태
const PAGE_SIZE = 10;
let currentPage = 1;
let searchTerm = '';
let filterRate = '';
let filterIssuer = '';

// DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadCoupons();
});

// 이벤트 리스너 초기화
function initializeEventListeners() {
    // 할인율 선택
    const customInput = document.getElementById('customDiscount');
    const stepper = document.getElementById('discountStepper');
    document.querySelectorAll('.discount-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.discount-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');

            if (this.dataset.value === 'custom') {
                stepper.style.display = 'flex';
                customInput.focus();
                selectedDiscount = parseInt(customInput.value) || 0;
            } else {
                stepper.style.display = 'none';
                selectedDiscount = parseInt(this.dataset.value);
            }
        });
    });

    // 직접입력 −/+ 스테퍼 (5단위 증감)
    document.getElementById('discountMinus').addEventListener('click', () => adjustDiscount(-5));
    document.getElementById('discountPlus').addEventListener('click', () => adjustDiscount(5));

    // 발행인 선택
    document.querySelectorAll('.issuer-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.issuer-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            selectedIssuer = this.dataset.issuer;
        });
    });

    // 직접입력 값 반영 + 5단위 실시간 안내
    customInput.addEventListener('input', updateCustomDiscount);

    // 쿠폰 발행 폼
    document.getElementById('couponForm').addEventListener('submit', handleCouponSubmit);

    // 탭 전환
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.dataset.tab;

            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            document.querySelectorAll('.tab-panel').forEach(panel => {
                panel.classList.toggle('active', panel.id === targetId);
            });
        });
    });

    // 이름 검색 (입력 즉시)
    document.getElementById('searchName').addEventListener('input', doSearch);
    // 할인율 필터 (선택 즉시)
    document.getElementById('filterDiscount').addEventListener('change', doSearch);
    // 발행인 필터 (선택 즉시)
    document.getElementById('filterIssuer').addEventListener('change', doSearch);
}

// 직접입력 −/+ (5단위, 5~100 범위)
function adjustDiscount(delta) {
    const input = document.getElementById('customDiscount');
    let val = (parseInt(input.value) || 0) + delta;
    if (val < 5) val = 5;
    if (val > 100) val = 100;
    input.value = val;
    updateCustomDiscount.call(input);
}

// 직접입력 값/검증/안내 갱신
function updateCustomDiscount() {
    selectedDiscount = parseInt(this.value) || 0;

    const hint = document.getElementById('customDiscountHint');
    const invalid = this.value !== '' &&
        (selectedDiscount < 5 || selectedDiscount > 100 || selectedDiscount % 5 !== 0);
    hint.style.display = invalid ? 'flex' : 'none';
    this.classList.toggle('input-error', invalid);
}

// 검색/필터 실행 (이름 + 할인율 함께 적용)
function doSearch() {
    searchTerm = document.getElementById('searchName').value.trim();
    filterRate = document.getElementById('filterDiscount').value;
    filterIssuer = document.getElementById('filterIssuer').value;
    currentPage = 1;
    renderCoupons();
}

// 쿠폰 발행 처리
async function handleCouponSubmit(e) {
    e.preventDefault();

    const friendName = document.getElementById('friendName').value.trim();
    const memo = document.getElementById('memo').value.trim();

    if (!selectedIssuer) {
        showToast('발행인을 선택해주세요.', 'error');
        return;
    }

    if (!friendName) {
        showToast('지인 이름을 입력해주세요.', 'error');
        return;
    }

    if (!selectedDiscount) {
        showToast('할인율을 선택해주세요.', 'error');
        return;
    }

    if (selectedDiscount < 5 || selectedDiscount > 100 || selectedDiscount % 5 !== 0) {
        showToast('할인율은 5단위로 입력해주세요 (5~100%).', 'error');
        return;
    }

    try {
        const couponId = generateCouponId();
        const couponData = {
            id: couponId,
            friend_name: friendName,
            memo: memo,
            discount_rate: selectedDiscount,
            issued_by: selectedIssuer,
            is_used: false,
            created_at: new Date().toISOString(),
            used_at: null
        };

        // Supabase에 저장 (실제 연결 시)
        // const { data, error } = await supabase
        //     .from('coupons')
        //     .insert([couponData]);
        const { data, error } = await supabaseClient
            .from('coupons')
            .insert([couponData]);

        if (error) {
            console.error('Supabase 에러:', error);
            showToast('쿠폰 발행 중 오류가 발생했습니다.', 'error');
            return;
        }

        // 임시로 로컬 저장
        // coupons.push(couponData);
        // localStorage.setItem('cafeCoupons', JSON.stringify(coupons));

        // 쿠폰 URL 생성
        const couponUrl = `${window.location.origin}/coupon-use.html?id=${couponId}`;

        // 성공 메시지와 함께 URL 표시
        showCouponCreated(friendName, selectedDiscount, couponUrl);

        // 폼 초기화
        document.getElementById('couponForm').reset();
        document.getElementById('friendName').value = '';
        document.getElementById('memo').value = '';

        // 할인율 선택 초기화 (선택 없음)
        selectedDiscount = 0;
        document.querySelectorAll('.discount-option').forEach(o => o.classList.remove('selected'));
        const customInput = document.getElementById('customDiscount');
        customInput.value = '';
        customInput.classList.remove('input-error');
        document.getElementById('discountStepper').style.display = 'none';
        document.getElementById('customDiscountHint').style.display = 'none';

        // 발행인 선택 초기화
        selectedIssuer = '';
        document.querySelectorAll('.issuer-option').forEach(o => o.classList.remove('selected'));

        // 목록 새로고침
        loadCoupons();

    } catch (error) {
        console.error('쿠폰 발행 에러:', error);
        showToast('쿠폰 발행 중 오류가 발생했습니다.', 'error');
    }
}

// 쿠폰 ID 생성
function generateCouponId() {
    return 'CAFE' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
}

// 쿠폰 목록 로드
async function loadCoupons() {
    try {
        document.getElementById('loading').style.display = 'block';

        // Supabase에서 로드 (실제 연결 시)
        // const { data, error } = await supabase
        //     .from('coupons')
        //     .select('*')
        //     .order('created_at', { ascending: false });
        const { data, error } = await supabaseClient
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

        if (error) {
            console.error('쿠폰 로드 에러:', error);
            showToast('쿠폰 정보를 불러오는 중 오류가 발생했습니다.', 'error');
            return;
        }

        coupons = data || [];

        // 임시로 로컬 스토리지에서 로드
        // const savedCoupons = localStorage.getItem('cafeCoupons');
        // coupons = savedCoupons ? JSON.parse(savedCoupons) : [];

        document.getElementById('loading').style.display = 'none';

        populateDiscountFilter();
        populateIssuerFilter();
        renderCoupons();
        updateStats();

    } catch (error) {
        console.error('쿠폰 로드 에러:', error);
        document.getElementById('loading').style.display = 'none';
        showToast('쿠폰 정보를 불러오는 중 오류가 발생했습니다.', 'error');
    }
}

// 할인율 필터 드롭다운 채우기
function populateDiscountFilter() {
    const select = document.getElementById('filterDiscount');
    const current = select.value;
    const rates = [...new Set(coupons.map(c => c.discount_rate))].sort((a, b) => a - b);
    select.innerHTML = '<option value="">전체 할인율</option>' +
        rates.map(r => `<option value="${r}">${r}%</option>`).join('');
    // 기존 선택값이 여전히 유효하면 유지
    select.value = rates.map(String).includes(current) ? current : '';
    filterRate = select.value;
}

// 발행인 필터 드롭다운 채우기 (실제 발행인 기준 동적 생성)
function populateIssuerFilter() {
    const select = document.getElementById('filterIssuer');
    const current = select.value;
    const issuers = [...new Set(coupons.map(c => c.issued_by).filter(Boolean))].sort();
    select.innerHTML = '<option value="">전체 발행인</option>' +
        issuers.map(n => `<option value="${n}">${n}</option>`).join('');
    select.value = issuers.includes(current) ? current : '';
    filterIssuer = select.value;
}

// 검색어·할인율 필터 적용
function getFilteredCoupons() {
    const term = searchTerm.toLowerCase();
    return coupons.filter(coupon => {
        const matchName = !term || (coupon.friend_name || '').toLowerCase().includes(term);
        const matchRate = !filterRate || String(coupon.discount_rate) === filterRate;
        const matchIssuer = !filterIssuer || coupon.issued_by === filterIssuer;
        return matchName && matchRate && matchIssuer;
    });
}

// 쿠폰 목록 렌더링 (검색/필터/페이지네이션 적용)
function renderCoupons() {
    const container = document.getElementById('couponListContainer');

    if (coupons.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                <p>아직 발행된 쿠폰이 없습니다.</p>
                <p>첫 번째 쿠폰을 만들어보세요!</p>
            </div>
        `;
        renderPagination(0);
        return;
    }

    const filtered = getFilteredCoupons();

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                <p>검색 조건에 맞는 쿠폰이 없습니다.</p>
            </div>
        `;
        renderPagination(0);
        return;
    }

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);

    container.innerHTML = pageItems.map(coupon => `
        <div class="coupon-item">
            <div class="coupon-body">
                <div class="coupon-head-row">
                    <span class="coupon-discount">${coupon.discount_rate}%</span>
                    <span class="coupon-name">${coupon.friend_name}</span>
                    ${coupon.memo ? `<span class="coupon-memo">${coupon.memo}</span>` : ''}
                </div>
                <dl class="coupon-meta-list">
                    <dt>발행인</dt><dd>${coupon.issued_by || '-'}</dd>
                    <dt>발행</dt><dd>${formatDate(coupon.created_at)}</dd>
                    ${coupon.is_used ? `<dt>사용</dt><dd class="meta-used">${formatDate(coupon.used_at)}</dd>` : ''}
                </dl>
            </div>
            <span class="coupon-status ${coupon.is_used ? 'status-used' : 'status-unused'}">${coupon.is_used ? '사용완료' : '미사용'}</span>
            <button class="btn-copy" onclick="copyCouponLink('${coupon.id}')">링크 복사</button>
        </div>
    `).join('');

    renderPagination(totalPages);
}

// 페이지네이션 렌더링
function renderPagination(totalPages) {
    const el = document.getElementById('pagination');

    if (totalPages <= 1) {
        el.innerHTML = '';
        return;
    }

    let html = `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">‹</button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">›</button>`;

    el.innerHTML = html;
}

// 페이지 이동
function goToPage(page) {
    currentPage = page;
    renderCoupons();
}

// 통계 업데이트
function updateStats() {
    const total = coupons.length;
    const used = coupons.filter(c => c.is_used).length;
    const unused = total - used;
    const usageRate = total > 0 ? Math.round((used / total) * 100) : 0;

    document.getElementById('totalCoupons').textContent = total;
    document.getElementById('usedCoupons').textContent = used;
    document.getElementById('unusedCoupons').textContent = unused;
    document.getElementById('usageRate').textContent = usageRate + '%';

    // 할인율별 통계 (실제 발행된 할인율 기준으로 동적 생성)
    const discountStats = {};
    const rates = [...new Set(coupons.map(c => c.discount_rate))].sort((a, b) => a - b);
    rates.forEach(rate => {
        const rateCoupons = coupons.filter(c => c.discount_rate === rate);
        const rateUsed = rateCoupons.filter(c => c.is_used).length;
        const rateTotal = rateCoupons.length;
        discountStats[rate] = {
            total: rateTotal,
            used: rateUsed,
            rate: rateTotal > 0 ? Math.round((rateUsed / rateTotal) * 100) : 0
        };
    });

    const rows = Object.entries(discountStats).map(([rate, stats]) => `
        <tr>
            <td><span class="rate-badge">${rate}%</span></td>
            <td>${stats.total}</td>
            <td>${stats.used}</td>
            <td>
                <div class="rate-cell">
                    <div class="rate-bar-wrap"><div class="rate-bar" style="width:${stats.rate}%"></div></div>
                    <span class="rate-pct">${stats.rate}%</span>
                </div>
            </td>
        </tr>
    `).join('');

    const discountStatsHtml = rows ? `
        <table class="discount-table">
            <thead>
                <tr>
                    <th>할인율</th>
                    <th>발행</th>
                    <th>사용</th>
                    <th>사용률</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    ` : '<p style="color: var(--text-muted); font-size: 0.875rem;">발행된 쿠폰이 없습니다.</p>';

    document.getElementById('discountStats').innerHTML = discountStatsHtml;
}

// 쿠폰 링크 복사
function copyCouponLink(couponId) {
    const url = `${window.location.origin}/coupon-use.html?id=${couponId}`;
    navigator.clipboard.writeText(url).then(() => {
        showToast('쿠폰 링크가 복사되었습니다!');
    }).catch(() => {
        // 폴백 방법
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('쿠폰 링크가 복사되었습니다!');
    });
}

// 쿠폰 생성 완료 알림
function showCouponCreated(friendName, discount, url) {
    const message = `${friendName}님용 ${discount}% 쿠폰이 발행되었습니다!`;
    showToast(message);

    // 자동으로 링크 복사
    setTimeout(() => {
        copyCouponLink(url.split('=')[1]);
    }, 1000);
}

// 토스트 메시지
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.background = type === 'error' ? '#dc2626' : 'var(--success)';
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 날짜 포맷팅 (실제 날짜 + 시간)
function formatDate(dateString) {
    return new Date(dateString).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}
