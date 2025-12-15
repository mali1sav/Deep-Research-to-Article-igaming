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
