import { Language } from '../types';

export type UiText = {
    introduction: string;
    platformOverview: string;
    platformComparison: string;
    platformReviews: string;
    allSources: string;

    platformInformation: string;
    platformRatings: string;
    overview: string;
    ourVerdict: string;
    pros: string;
    cons: string;

    tablePlatform: string;
    tableLicense: string;
    tableMinDeposit: string;
    tablePayoutSpeed: string;
    tableRating: string;

    infosheetLicense: string;
    infosheetCountry: string;
    infosheetCompany: string;
    infosheetEstablished: string;
    infosheetMinDeposit: string;
    infosheetPayoutSpeed: string;
    infosheetCurrencies: string;
    infosheetPaymentMethods: string;

    frequentlyAskedQuestions: string;

    // Rating Methodology Section
    ratingMethodologyTitle: string;
    ratingMethodologyIntro: string;
    ratingScore: string;
    ratingMeaning: string;
    ratingCriteria: string;
    ratingExceptional: string;
    ratingExcellent: string;
    ratingVeryGood: string;
    ratingGood: string;
    ratingAdequate: string;
    ratingBelowAverage: string;
    ratingExceptionalCriteria: string;
    ratingExcellentCriteria: string;
    ratingVeryGoodCriteria: string;
    ratingGoodCriteria: string;
    ratingAdequateCriteria: string;
    ratingBelowAverageCriteria: string;
    starRatingAggregation: string;

    translateRatingCategory: (category: string) => string;

    visitPlatformCta: (platformName: string) => string;
    platformReviewTitle: (platformName: string) => string;
};

export const getUiText = (language: Language): UiText => {
    switch (language) {
        case Language.THAI:
            return {
                introduction: 'บทนำ',
                platformOverview: 'ภาพรวมแพลตฟอร์ม',
                platformComparison: 'เปรียบเทียบแพลตฟอร์ม',
                platformReviews: 'รีวิวแพลตฟอร์ม',
                allSources: 'แหล่งข้อมูลทั้งหมด',

                platformInformation: 'ข้อมูลแพลตฟอร์ม',
                platformRatings: 'คะแนนแพลตฟอร์ม',
                overview: 'ภาพรวม',
                ourVerdict: 'บทสรุปของเรา',
                pros: 'ข้อดี',
                cons: 'ข้อเสีย',

                tablePlatform: 'แพลตฟอร์ม',
                tableLicense: 'ใบอนุญาต',
                tableMinDeposit: 'ฝากขั้นต่ำ',
                tablePayoutSpeed: 'ความเร็วการถอน',
                tableRating: 'คะแนน',

                infosheetLicense: 'ใบอนุญาต',
                infosheetCountry: 'ประเทศ',
                infosheetCompany: 'บริษัท',
                infosheetEstablished: 'ก่อตั้ง',
                infosheetMinDeposit: 'ฝากขั้นต่ำ',
                infosheetPayoutSpeed: 'ความเร็วการถอน',
                infosheetCurrencies: 'สกุลเงิน',
                infosheetPaymentMethods: 'วิธีชำระเงิน',

                frequentlyAskedQuestions: 'คำถามที่พบบ่อย',

                ratingMethodologyTitle: 'วิธีการให้คะแนนของเรา',
                ratingMethodologyIntro: 'เราประเมินแต่ละแพลตฟอร์มใน 6 หมวดหมู่หลัก โดยให้คะแนน 1-10:',
                ratingScore: 'คะแนน',
                ratingMeaning: 'ความหมาย',
                ratingCriteria: 'เกณฑ์',
                ratingExceptional: 'ยอดเยี่ยม',
                ratingExcellent: 'ดีเยี่ยม',
                ratingVeryGood: 'ดีมาก',
                ratingGood: 'ดี',
                ratingAdequate: 'พอใช้',
                ratingBelowAverage: 'ต่ำกว่าค่าเฉลี่ย',
                ratingExceptionalCriteria: 'ชั้นนำในอุตสาหกรรม ยืนยันจากหลายแหล่ง',
                ratingExcellentCriteria: 'ระดับสูงสุด มีพื้นที่ปรับปรุงเล็กน้อย',
                ratingVeryGoodCriteria: 'สูงกว่าค่าเฉลี่ย ผ่านมาตรฐานสูง',
                ratingGoodCriteria: 'แข็งแกร่ง ตรงตามความคาดหวัง',
                ratingAdequateCriteria: 'ยอมรับได้ แต่มีช่องว่าง',
                ratingBelowAverageCriteria: 'พบปัญหาสำคัญ',
                starRatingAggregation: 'การรวมคะแนนดาว: คะแนนดาวรวม (1-5 ดาว) คำนวณจากค่าเฉลี่ยของคะแนนทั้ง 6 หมวด: 9.0-10 = ⭐⭐⭐⭐⭐ | 7.5-8.9 = ⭐⭐⭐⭐ | 6.0-7.4 = ⭐⭐⭐ | 4.5-5.9 = ⭐⭐ | ต่ำกว่า 4.5 = ⭐',

                translateRatingCategory: (category) => {
                    const c = category.trim().toLowerCase();
                    const map: Record<string, string> = {
                        'payment methods': 'วิธีชำระเงิน',
                        'user experience': 'ประสบการณ์ผู้ใช้',
                        'withdrawal speed': 'ความเร็วการถอน',
                        'game selection': 'ตัวเลือกเกม',
                        'customer support': 'บริการลูกค้า',
                        'bonuses & promotions': 'โบนัสและโปรโมชัน',
                        'bonuses and promotions': 'โบนัสและโปรโมชัน'
                    };
                    return map[c] || category;
                },

                visitPlatformCta: (platformName) => `ไปที่ ${platformName}`,
                platformReviewTitle: (platformName) => `รีวิว ${platformName}`
            };

        case Language.VIETNAMESE:
            return {
                introduction: 'Giới thiệu',
                platformOverview: 'Tổng quan nền tảng',
                platformComparison: 'So sánh nền tảng',
                platformReviews: 'Đánh giá nền tảng',
                allSources: 'Tất cả nguồn',

                platformInformation: 'Thông tin nền tảng',
                platformRatings: 'Xếp hạng nền tảng',
                overview: 'Tổng quan',
                ourVerdict: 'Kết luận',
                pros: 'Ưu điểm',
                cons: 'Nhược điểm',

                tablePlatform: 'Nền tảng',
                tableLicense: 'Giấy phép',
                tableMinDeposit: 'Tiền gửi tối thiểu',
                tablePayoutSpeed: 'Tốc độ rút tiền',
                tableRating: 'Đánh giá',

                infosheetLicense: 'Giấy phép',
                infosheetCountry: 'Quốc gia',
                infosheetCompany: 'Công ty',
                infosheetEstablished: 'Thành lập',
                infosheetMinDeposit: 'Tiền gửi tối thiểu',
                infosheetPayoutSpeed: 'Tốc độ rút tiền',
                infosheetCurrencies: 'Tiền tệ',
                infosheetPaymentMethods: 'Phương thức thanh toán',

                frequentlyAskedQuestions: 'Câu hỏi thường gặp',

                ratingMethodologyTitle: 'Phương pháp đánh giá của chúng tôi',
                ratingMethodologyIntro: 'Chúng tôi đánh giá mỗi nền tảng theo 6 tiêu chí chính, với điểm từ 1-10:',
                ratingScore: 'Điểm',
                ratingMeaning: 'Ý nghĩa',
                ratingCriteria: 'Tiêu chí',
                ratingExceptional: 'Xuất sắc',
                ratingExcellent: 'Tuyệt vời',
                ratingVeryGood: 'Rất tốt',
                ratingGood: 'Tốt',
                ratingAdequate: 'Đạt yêu cầu',
                ratingBelowAverage: 'Dưới trung bình',
                ratingExceptionalCriteria: 'Hàng đầu ngành, được xác minh từ nhiều nguồn',
                ratingExcellentCriteria: 'Cấp cao nhất với không gian cải thiện nhỏ',
                ratingVeryGoodCriteria: 'Trên trung bình, đạt tiêu chuẩn cao',
                ratingGoodCriteria: 'Ổn định, đáp ứng kỳ vọng',
                ratingAdequateCriteria: 'Chấp nhận được nhưng có lỗ hổng',
                ratingBelowAverageCriteria: 'Có vấn đề đáng chú ý',
                starRatingAggregation: 'Tổng hợp xếp hạng sao: Xếp hạng sao tổng thể (1-5 sao) được tính bằng trung bình của 6 tiêu chí: 9.0-10 = ⭐⭐⭐⭐⭐ | 7.5-8.9 = ⭐⭐⭐⭐ | 6.0-7.4 = ⭐⭐⭐ | 4.5-5.9 = ⭐⭐ | Dưới 4.5 = ⭐',

                translateRatingCategory: (category) => {
                    const c = category.trim().toLowerCase();
                    const map: Record<string, string> = {
                        'payment methods': 'Phương thức thanh toán',
                        'user experience': 'Trải nghiệm người dùng',
                        'withdrawal speed': 'Tốc độ rút tiền',
                        'game selection': 'Kho trò chơi',
                        'customer support': 'Hỗ trợ khách hàng',
                        'bonuses & promotions': 'Thưởng & khuyến mãi',
                        'bonuses and promotions': 'Thưởng & khuyến mãi'
                    };
                    return map[c] || category;
                },

                visitPlatformCta: (platformName) => `Truy cập ${platformName}`,
                platformReviewTitle: (platformName) => `Đánh giá ${platformName}`
            };

        case Language.JAPANESE:
            return {
                introduction: 'はじめに',
                platformOverview: 'プラットフォーム概要',
                platformComparison: 'プラットフォーム比較',
                platformReviews: 'プラットフォームレビュー',
                allSources: '参考情報',

                platformInformation: 'プラットフォーム情報',
                platformRatings: '評価',
                overview: '概要',
                ourVerdict: '総評',
                pros: 'メリット',
                cons: 'デメリット',

                tablePlatform: 'プラットフォーム',
                tableLicense: 'ライセンス',
                tableMinDeposit: '最低入金額',
                tablePayoutSpeed: '出金スピード',
                tableRating: '評価',

                infosheetLicense: 'ライセンス',
                infosheetCountry: '国',
                infosheetCompany: '運営会社',
                infosheetEstablished: '設立',
                infosheetMinDeposit: '最低入金額',
                infosheetPayoutSpeed: '出金スピード',
                infosheetCurrencies: '対応通貨',
                infosheetPaymentMethods: '支払い方法',

                frequentlyAskedQuestions: 'よくある質問',

                ratingMethodologyTitle: '評価方法',
                ratingMethodologyIntro: '各プラットフォームを6つの主要カテゴリで評価し、1-10のスコアで採点します:',
                ratingScore: 'スコア',
                ratingMeaning: '評価',
                ratingCriteria: '基準',
                ratingExceptional: '卓越',
                ratingExcellent: '優秀',
                ratingVeryGood: '非常に良い',
                ratingGood: '良い',
                ratingAdequate: '適切',
                ratingBelowAverage: '平均以下',
                ratingExceptionalCriteria: '業界トップ、複数の情報源で確認済み',
                ratingExcellentCriteria: '最高レベル、わずかな改善の余地あり',
                ratingVeryGoodCriteria: '平均以上、高い基準を満たす',
                ratingGoodCriteria: '堅実、期待に応える',
                ratingAdequateCriteria: '許容範囲だがギャップあり',
                ratingBelowAverageCriteria: '重大な問題が指摘される',
                starRatingAggregation: 'スター評価集計: 総合スター評価（1-5つ星）は6カテゴリの平均で算出: 9.0-10 = ⭐⭐⭐⭐⭐ | 7.5-8.9 = ⭐⭐⭐⭐ | 6.0-7.4 = ⭐⭐⭐ | 4.5-5.9 = ⭐⭐ | 4.5未満 = ⭐',

                translateRatingCategory: (category) => {
                    const c = category.trim().toLowerCase();
                    const map: Record<string, string> = {
                        'payment methods': '入出金方法',
                        'user experience': 'ユーザー体験',
                        'withdrawal speed': '出金スピード',
                        'game selection': 'ゲームの品揃え',
                        'customer support': 'カスタマーサポート',
                        'bonuses & promotions': 'ボーナス・プロモーション',
                        'bonuses and promotions': 'ボーナス・プロモーション'
                    };
                    return map[c] || category;
                },

                visitPlatformCta: (platformName) => `${platformName}へ移動`,
                platformReviewTitle: (platformName) => `${platformName}のレビュー`
            };

        case Language.KOREAN:
            return {
                introduction: '소개',
                platformOverview: '플랫폼 개요',
                platformComparison: '플랫폼 비교',
                platformReviews: '플랫폼 리뷰',
                allSources: '전체 출처',

                platformInformation: '플랫폼 정보',
                platformRatings: '플랫폼 평점',
                overview: '개요',
                ourVerdict: '총평',
                pros: '장점',
                cons: '단점',

                tablePlatform: '플랫폼',
                tableLicense: '라이선스',
                tableMinDeposit: '최소 입금',
                tablePayoutSpeed: '출금 속도',
                tableRating: '평점',

                infosheetLicense: '라이선스',
                infosheetCountry: '국가',
                infosheetCompany: '운영사',
                infosheetEstablished: '설립',
                infosheetMinDeposit: '최소 입금',
                infosheetPayoutSpeed: '출금 속도',
                infosheetCurrencies: '통화',
                infosheetPaymentMethods: '결제 수단',

                frequentlyAskedQuestions: '자주 묻는 질문',

                ratingMethodologyTitle: '평가 방법론',
                ratingMethodologyIntro: '각 플랫폼을 6가지 핵심 카테고리에서 1-10점으로 평가합니다:',
                ratingScore: '점수',
                ratingMeaning: '의미',
                ratingCriteria: '기준',
                ratingExceptional: '탁월함',
                ratingExcellent: '우수함',
                ratingVeryGood: '매우 좋음',
                ratingGood: '좋음',
                ratingAdequate: '적절함',
                ratingBelowAverage: '평균 이하',
                ratingExceptionalCriteria: '업계 최고, 여러 출처에서 검증됨',
                ratingExcellentCriteria: '최상위급, 약간의 개선 여지 있음',
                ratingVeryGoodCriteria: '평균 이상, 높은 기준 충족',
                ratingGoodCriteria: '견고함, 기대에 부응',
                ratingAdequateCriteria: '수용 가능하나 부족한 부분 있음',
                ratingBelowAverageCriteria: '중요한 문제 발견됨',
                starRatingAggregation: '별점 집계: 전체 별점(1-5성)은 6개 카테고리 평균으로 계산: 9.0-10 = ⭐⭐⭐⭐⭐ | 7.5-8.9 = ⭐⭐⭐⭐ | 6.0-7.4 = ⭐⭐⭐ | 4.5-5.9 = ⭐⭐ | 4.5 미만 = ⭐',

                translateRatingCategory: (category) => {
                    const c = category.trim().toLowerCase();
                    const map: Record<string, string> = {
                        'payment methods': '결제 수단',
                        'user experience': '사용자 경험',
                        'withdrawal speed': '출금 속도',
                        'game selection': '게임 선택',
                        'customer support': '고객 지원',
                        'bonuses & promotions': '보너스 및 프로모션',
                        'bonuses and promotions': '보너스 및 프로모션'
                    };
                    return map[c] || category;
                },

                visitPlatformCta: (platformName) => `${platformName} 방문`,
                platformReviewTitle: (platformName) => `${platformName} 리뷰`
            };

        case Language.ENGLISH:
        default:
            return {
                introduction: 'Introduction',
                platformOverview: 'Platform Overview',
                platformComparison: 'Platform Comparison',
                platformReviews: 'Platform Reviews',
                allSources: 'All Sources',

                platformInformation: 'Platform Information',
                platformRatings: 'Platform Ratings',
                overview: 'Overview',
                ourVerdict: 'Our Verdict',
                pros: 'Pros',
                cons: 'Cons',

                tablePlatform: 'Platform',
                tableLicense: 'License',
                tableMinDeposit: 'Min Deposit',
                tablePayoutSpeed: 'Payout Speed',
                tableRating: 'Rating',

                infosheetLicense: 'License',
                infosheetCountry: 'Country',
                infosheetCompany: 'Company',
                infosheetEstablished: 'Established',
                infosheetMinDeposit: 'Min Deposit',
                infosheetPayoutSpeed: 'Payout Speed',
                infosheetCurrencies: 'Currencies',
                infosheetPaymentMethods: 'Payment Methods',

                frequentlyAskedQuestions: 'Frequently Asked Questions',

                ratingMethodologyTitle: 'Our Rating Methodology',
                ratingMethodologyIntro: 'We evaluate each platform across six key categories, with scores from 1-10:',
                ratingScore: 'Score',
                ratingMeaning: 'Meaning',
                ratingCriteria: 'Criteria',
                ratingExceptional: 'Exceptional',
                ratingExcellent: 'Excellent',
                ratingVeryGood: 'Very Good',
                ratingGood: 'Good',
                ratingAdequate: 'Adequate',
                ratingBelowAverage: 'Below Average',
                ratingExceptionalCriteria: 'Industry-leading, verified by multiple sources',
                ratingExcellentCriteria: 'Top-tier with minor room for improvement',
                ratingVeryGoodCriteria: 'Above average, meets high standards',
                ratingGoodCriteria: 'Solid, meets expectations',
                ratingAdequateCriteria: 'Acceptable but has gaps',
                ratingBelowAverageCriteria: 'Significant issues noted',
                starRatingAggregation: 'Star Rating Aggregation: The overall star rating (1-5 stars) is calculated by averaging all six category scores: 9.0-10 = ⭐⭐⭐⭐⭐ | 7.5-8.9 = ⭐⭐⭐⭐ | 6.0-7.4 = ⭐⭐⭐ | 4.5-5.9 = ⭐⭐ | Below 4.5 = ⭐',

                translateRatingCategory: (category) => category,

                visitPlatformCta: (platformName) => `Visit ${platformName}`,
                platformReviewTitle: (platformName) => `${platformName} Review`
            };
    }
};

export const getHtmlLang = (language: Language): string => {
    switch (language) {
        case Language.THAI:
            return 'th';
        case Language.VIETNAMESE:
            return 'vi';
        case Language.JAPANESE:
            return 'ja';
        case Language.KOREAN:
            return 'ko';
        case Language.ENGLISH:
        default:
            return 'en';
    }
};
