'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, CheckCircle, XCircle, Search, UserPlus, FileText } from "lucide-react"

import { searchUsers as searchUserAction } from '@/app/admin/actions'

import {
    approveRechargeRequest as approveAction,
    rejectRechargeRequest as rejectAction,
    adjustCreditsManually
} from '@/app/admin/actions/credits'

import type {
    RechargeRequest,
    CreditTransaction
} from '@/types/credit'

interface CreditManagerProps {
    initialRequests: RechargeRequest[]
    initialTransactions: CreditTransaction[]
}

export function AdminCreditManager({ initialRequests, initialTransactions }: CreditManagerProps) {
    // State for lists
    const [requests, setRequests] = useState(initialRequests)
    const [transactions, setTransactions] = useState(initialTransactions)
    
    // Manual Adjustment State
    const [adjustmentType, setAdjustmentType] = useState<'add' | 'deduct'>('add')
    const [adjustmentAmount, setAdjustmentAmount] = useState('')
    const [adjustmentReason, setAdjustmentReason] = useState('')
    const [selectedUser, setSelectedUser] = useState<{id: string, name: string | null, email: string} | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<{id: string, name: string | null, email: string}[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Request Processing State
    const [processingId, setProcessingId] = useState<string | null>(null)

    const handleSearch = async () => {
        if (!searchQuery.trim()) return
        setIsSearching(true)
        try {
            const results = await searchUserAction(searchQuery)
            setSearchResults(results as any)
        } catch {
            toast.error('검색 중 오류 발생')
        } finally {
            setIsSearching(false)
        }
    }

    const handleAdjust = async () => {
        if (!selectedUser || !adjustmentAmount || !adjustmentReason) {
            toast.error('모든 필드를 입력해주세요.')
            return
        }

        setIsSubmitting(true)
        try {
            const amount = parseInt(adjustmentAmount)
            // adjustCreditsManually expects signed amount (+ for add, - for deduct)
            const finalAmount = adjustmentType === 'add' ? amount : -amount
            
            const result = await adjustCreditsManually(
                selectedUser.id,
                finalAmount,
                adjustmentReason
            )

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('크레딧이 조정되었습니다.')
                // Reset form
                setSelectedUser(null)
                setAdjustmentAmount('')
                setAdjustmentReason('')
                setSearchQuery('')
                setSearchResults([])
            }
        } catch (e) {
            console.error(e)
            toast.error('오류가 발생했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleApprove = async (id: string) => {
        setProcessingId(id)
        try {
            const result = await approveAction(id)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('승인되었습니다.')
                setRequests(prev => prev.filter(r => r.id !== id))
            }
        } catch {
            toast.error('승인 중 오류 발생')
        } finally {
            setProcessingId(null)
        }
    }

    const handleReject = async (id: string) => {
        setProcessingId(id)
        try {
            const result = await rejectAction(id, 'Admin Rejection')
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('거절되었습니다.')
                setRequests(prev => prev.filter(r => r.id !== id))
            }
        } catch {
            toast.error('거절 중 오류 발생')
        } finally {
            setProcessingId(null)
        }
    }

    return (
        <Tabs defaultValue="requests" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                <TabsTrigger value="requests">충전 요청 ({requests.length})</TabsTrigger>
                <TabsTrigger value="manual">수동 지급/차감</TabsTrigger>
                <TabsTrigger value="history">트랜잭션 내역</TabsTrigger>
            </TabsList>

            {/* 1. Recharge Requests */}
            <TabsContent value="requests" className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>충전 요청 관리</CardTitle>
                        <CardDescription>사용자가 요청한 크레딧 충전 요청을 승인하거나 거절합니다.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {requests.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>요청일시</TableHead>
                                        <TableHead>사용자</TableHead>
                                        <TableHead>패키지</TableHead>
                                        <TableHead>결제금액</TableHead>
                                        <TableHead>지급 크레딧</TableHead>
                                        <TableHead className="text-right">관리</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell>{new Date(req.created_at).toLocaleDateString('ko-KR')}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{req.profiles?.name || '이름 없음'}</span>
                                                    <span className="text-xs text-slate-500">{req.profiles?.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{req.package_type}</TableCell>
                                            <TableCell>{req.price.toLocaleString()}원</TableCell>
                                            <TableCell className="font-bold text-blue-600">+{req.credits_granted}C</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    onClick={() => handleReject(req.id)}
                                                    disabled={!!processingId}
                                                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                                >
                                                    {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : '거절'}
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => handleApprove(req.id)}
                                                    disabled={!!processingId}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                >
                                                    {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : '승인'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-12 text-slate-500">
                                대기 중인 충전 요청이 없습니다.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* 2. Manual Adjustment */}
            <TabsContent value="manual" className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>수동 지급 / 차감</CardTitle>
                        <CardDescription>특정 회원에게 크레딧을 수동으로 지급하거나 차감합니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 max-w-2xl">
                        {/* User Search */}
                        <div className="space-y-2">
                            <Label>대상 회원 검색</Label>
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="이름 또는 이메일 검색" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <Button onClick={handleSearch} disabled={isSearching} variant="outline">
                                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                </Button>
                            </div>
                            
                            {/* Search Results */}
                            {searchResults.length > 0 && !selectedUser && (
                                <div className="border rounded-md divide-y mt-2 max-h-40 overflow-y-auto">
                                    {searchResults.map(user => (
                                        <div 
                                            key={user.id} 
                                            className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                                            onClick={() => {
                                                setSelectedUser(user)
                                                setSearchResults([])
                                                setSearchQuery('')
                                            }}
                                        >
                                            <span>{user.name} ({user.email})</span>
                                            <Button size="sm" variant="ghost" className="h-6">선택</Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Selected User */}
                            {selectedUser && (
                                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-lg mt-2">
                                    <div>
                                        <span className="font-bold text-blue-900">{selectedUser.name}</span>
                                        <span className="text-sm text-blue-700 ml-2">{selectedUser.email}</span>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => setSelectedUser(null)} className="h-6 w-6 p-0 rounded-full hover:bg-blue-100">
                                        <XCircle className="w-4 h-4 text-blue-500" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>유형</Label>
                                <Select value={adjustmentType} onValueChange={(v: any) => setAdjustmentType(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="add">지급 (Add)</SelectItem>
                                        <SelectItem value="deduct">차감 (Deduct)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>크레딧 양 ({adjustmentType === 'add' ? '지급' : '차감'})</Label>
                                <Input 
                                    type="number" 
                                    placeholder="0" 
                                    value={adjustmentAmount}
                                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>사유 (필수)</Label>
                            <Input 
                                placeholder="예: 이벤트 당첨, 시스템 오류 보상 등" 
                                value={adjustmentReason}
                                onChange={(e) => setAdjustmentReason(e.target.value)}
                            />
                        </div>

                        <Button 
                            className="w-full" 
                            onClick={handleAdjust} 
                            disabled={isSubmitting || !selectedUser}
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {adjustmentType === 'add' ? '지급하기' : '차감하기'}
                        </Button>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* 3. Transaction History */}
            <TabsContent value="history">
                 <Card>
                    <CardHeader>
                        <CardTitle>전체 트랜잭션 내역</CardTitle>
                        <CardDescription>최근 100건의 모든 크레딧 입출금 내역입니다.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>일시</TableHead>
                                    <TableHead>사용자</TableHead>
                                    <TableHead>유형</TableHead>
                                    <TableHead>변동량</TableHead>
                                    <TableHead>사유</TableHead>
                                    <TableHead>메모</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="text-xs text-slate-500">
                                            {new Date(tx.created_at).toLocaleString('ko-KR')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{tx.profiles?.name || '이름 없음'}</span>
                                                <span className="text-[10px] text-slate-400">{tx.profiles?.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={tx.amount > 0 ? 'default' : 'destructive'} className="text-[10px]">
                                                {tx.transaction_type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={tx.amount > 0 ? 'text-blue-600 font-bold' : 'text-red-500 font-bold'}>
                                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                                        </TableCell>
                                        <TableCell className="text-xs">{tx.reason}</TableCell>
                                        <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">{tx.memo}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                 </Card>
            </TabsContent>
        </Tabs>
    )
}
