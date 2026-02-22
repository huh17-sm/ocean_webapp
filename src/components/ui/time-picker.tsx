import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  name?: string
  required?: boolean
  className?: string
}

export function TimePicker({ value, defaultValue, onChange, name, required, className }: TimePickerProps) {
  // uncontrolled 초기값 혹은 controlled value를 사용
  const initialValue = value || defaultValue || "09:00"
  
  const [hour, setHour] = React.useState<string>(initialValue.split(':')[0])
  const [minute, setMinute] = React.useState<string>(initialValue.split(':')[1])

  React.useEffect(() => {
    if (value) {
      setHour(value.split(':')[0])
      setMinute(value.split(':')[1])
    }
  }, [value])

  const handleHourChange = (newHour: string) => {
    setHour(newHour)
    if (onChange) {
      onChange(`${newHour}:${minute}`)
    }
  }

  const handleMinuteChange = (newMinute: string) => {
    setMinute(newMinute)
    if (onChange) {
      onChange(`${hour}:${newMinute}`)
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* 폼 제출을 위한 hidden input */}
      {name && <input type="hidden" name={name} value={`${hour}:${minute}`} required={required} />}
      
      <Select value={hour} onValueChange={handleHourChange}>
        <SelectTrigger className="flex-1 min-w-[70px]">
          <SelectValue placeholder="시" />
        </SelectTrigger>
        <SelectContent className="max-h-[250px] overflow-y-auto">
          {Array.from({ length: 24 }).map((_, i) => {
            const h = i.toString().padStart(2, '0')
            return <SelectItem key={`hour-${h}`} value={h}>{h}</SelectItem>
          })}
        </SelectContent>
      </Select>
      <span className="text-slate-500">:</span>
      <Select value={minute} onValueChange={handleMinuteChange}>
        <SelectTrigger className="flex-1 min-w-[70px]">
          <SelectValue placeholder="분" />
        </SelectTrigger>
        <SelectContent>
          {['00', '15', '30', '45'].map((m) => (
            <SelectItem key={`minute-${m}`} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
