#!/bin/bash

# 크레딧 시스템 마이그레이션 실행 스크립트
# 
# 이 스크립트는 Supabase에 크레딧 시스템 테이블과 함수를 생성합니다.
# 
# 사용법:
#   chmod +x scripts/migrate-credit-system.sh
#   ./scripts/migrate-credit-system.sh

echo "🌊 오션프리다이빙 크레딧 시스템 마이그레이션 시작..."
echo ""

# Supabase CLI 설치 확인
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI가 설치되어 있지 않습니다."
    echo "다음 명령어로 설치해주세요:"
    echo "  npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI 확인 완료"
echo ""

# 마이그레이션 파일 확인
MIGRATION_FILE="supabase/migrations/20260209_credit_system.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ 마이그레이션 파일을 찾을 수 없습니다: $MIGRATION_FILE"
    exit 1
fi

echo "✅ 마이그레이션 파일 확인 완료"
echo ""

# Supabase 프로젝트 연결 확인
echo "📡 Supabase 프로젝트 연결 확인 중..."
if ! supabase status &> /dev/null; then
    echo "⚠️  로컬 Supabase가 실행되지 않았습니다."
    echo "다음 명령어로 시작해주세요:"
    echo "  supabase start"
    echo ""
    echo "또는 원격 프로젝트에 직접 연결하려면:"
    echo "  supabase link --project-ref [YOUR_PROJECT_REF]"
    exit 1
fi

echo "✅ Supabase 연결 확인 완료"
echo ""

# 마이그레이션 실행
echo "🚀 마이그레이션 실행 중..."
echo ""

supabase db push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 크레딧 시스템 마이그레이션 완료!"
    echo ""
    echo "생성된 테이블:"
    echo "  - credit_transactions (크레딧 거래 내역)"
    echo "  - certification_requests (자격증 발급 신청)"
    echo "  - attendance_logs (정기 트레이닝 출석)"
    echo "  - package_purchases (패키지 구매 내역)"
    echo ""
    echo "생성된 함수:"
    echo "  - deduct_credits() (크레딧 차감)"
    echo "  - add_credits() (크레딧 추가)"
    echo ""
    echo "다음 단계:"
    echo "  1. 개발 서버 재시작: npm run dev"
    echo "  2. 관리자 페이지에서 패키지 판매 테스트"
    echo "  3. 사용자 페이지에서 크레딧 확인"
    echo ""
else
    echo ""
    echo "❌ 마이그레이션 실행 중 오류가 발생했습니다."
    echo "위의 오류 메시지를 확인해주세요."
    exit 1
fi
