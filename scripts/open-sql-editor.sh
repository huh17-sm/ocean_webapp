#!/bin/bash

echo "🚀 Supabase SQL Editor를 브라우저에서 엽니다..."
echo ""
echo "📋 다음 SQL을 복사해서 실행하세요:"
echo ""
echo "alter table public.class_requests drop constraint if exists class_requests_status_check;"
echo ""
echo "alter table public.class_requests add constraint class_requests_status_check check (status in ('pending', 'approved', 'rejected', 'cancelled'));"
echo ""
echo "---"
echo ""

# 프로젝트 ID 추출
PROJECT_REF="fzsxkssweptpmrengunf"
SQL_EDITOR_URL="https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"

echo "🌐 브라우저에서 열기: $SQL_EDITOR_URL"
echo ""

# macOS에서 브라우저 열기
open "$SQL_EDITOR_URL"

echo "✅ 브라우저가 열렸습니다!"
echo ""
echo "📝 SQL Editor에서 위의 SQL을 붙여넣고 Run을 클릭하세요."
