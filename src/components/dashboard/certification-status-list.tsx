'use client'

import { CertificationRequest } from "@/types/credit"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"


interface CertificationStatusListProps {
  requests: CertificationRequest[]
}

export function CertificationStatusList({ requests }: CertificationStatusListProps) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed">
        신청 내역이 없습니다.
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="h-[200px] overflow-y-auto custom-scrollbar">
          <div className="divide-y">
            {requests.map((req) => (
              <div key={req.id} className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{req.certification_type}</span>
                    <Badge variant="outline" className={
                      req.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                      req.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                      'bg-red-100 text-red-800 border-red-200'
                    }>
                      {req.status === 'pending' ? '승인 대기' : 
                       req.status === 'approved' ? '발급 완료' : 
                       '반려됨'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    신청일: {new Date(req.created_at).toLocaleDateString()}
                  </p>
                </div>
                {req.admin_memo && (
                  <div className="text-xs text-slate-500 max-w-[200px] text-right truncate">
                     메모: {req.admin_memo}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
