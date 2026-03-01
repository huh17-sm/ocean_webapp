"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import {
  DayPicker,
  getDefaultClassNames,
  useNavigation,
  useDayPicker,
  type DayButton,
  type CaptionProps,
} from "react-day-picker"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

import { isRedDay } from "@/lib/holidays"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 ocean-calendar-scope", className)}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-full", defaultClassNames.root),
        months: cn(
          "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
          defaultClassNames.months
        ),
        month: cn("space-y-4 w-full", defaultClassNames.month),
        nav: cn("hidden", defaultClassNames.nav),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-9 w-9 bg-transparent p-0 opacity-50 hover:opacity-100 transition-opacity", // Sizing adjust
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-9 w-9 bg-transparent p-0 opacity-50 hover:opacity-100 transition-opacity",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "hidden",
          defaultClassNames.month_caption
        ),
        caption_label: cn(
          "hidden",
          defaultClassNames.caption_label
        ),
        month_grid: "w-full border-collapse",
        weekdays: "grid grid-cols-7 gap-0 mb-2",
        weekday: "text-muted-foreground text-center w-full font-normal text-[0.8rem]",
        weeks: "w-full",
        week: "grid grid-cols-7 gap-0 mt-1",
        day: "h-10 w-full text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-blue-50/80 transition-colors rounded-xl", // Rounded-xl for modern look
          defaultClassNames.day_button
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected:
          "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white shadow-md shadow-blue-200", // Strong ocean blue selection with shadow
        day_today: "bg-slate-100 text-slate-900 font-bold", // Subtle today highlight
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  )
}

export function CalendarDayButton({
  className,
  day,
  modifiers,
  dayClasses,
  hasRequest,
  children, // children prop 추가
  ...props
}: React.ComponentProps<typeof DayButton> & { dayClasses?: Array<{ id: string; type: 'pool' | 'theory' | 'training' }>, hasRequest?: boolean }) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const isSelected = modifiers.selected
  const date = day.date
  
  const isRed = isRedDay(date)

  // Admin 모드: dayClasses를 prop으로 받지 않고, children으로 커스텀 UI를 직접 넘겨줌
  // User 모드: dayClasses를 prop으로 받고, children은 날짜 숫자(또는 undefined)임 -> 날짜 + 점 표시

  const isCustomComponent = React.isValidElement(children) && !dayClasses

  const content = isCustomComponent ? children : (
    <div className="relative flex flex-col items-center justify-center h-full w-full">
      <span className={cn(
        "text-sm font-medium leading-none",
        isSelected 
          ? "text-white" 
          : modifiers.disabled 
            ? "text-slate-300" // Disabled/Blocked dates are gray
            : (isRed ? "text-red-500 font-bold" : "") // Holidays are red (if not selected/disabled)
      )}>{date.getDate()}</span>
      
      {/* If children is passed (e.g. block reason) and not custom component override, render it here */}
      {React.isValidElement(children) && !isCustomComponent && children}

      {/* 수업 점(dot) + 요청 점(노란색) 표시 영역 */}
      {((dayClasses && dayClasses.length > 0) || hasRequest) && (
        <div className="absolute bottom-1 flex gap-0.5 justify-center flex-wrap z-10 w-full px-0.5">
          {dayClasses && dayClasses.slice(0, 3).map((cls, i) => (
            <div
              key={cls.id + i}
              className={cn(
                "w-1 h-1 rounded-full ring-1 ring-white/50",
                cls.type === 'pool' && "bg-blue-500",
                cls.type === 'theory' && "bg-amber-500",
                cls.type === 'training' && "bg-green-500"
              )}
            />
          ))}
          {/* 사용자 수업 요청이 있는 날짜에 노란 점 표시 */}
          {hasRequest && (
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 ring-1 ring-white/50 animate-pulse" />
          )}
        </div>
      )}
    </div>
  )
  
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={format(day.date, "yyyy-MM-dd")} 
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "h-10 w-full p-0 font-normal aria-selected:opacity-100 relative transition-all duration-200 rounded-xl", 
        "flex flex-col items-center justify-center gap-1",
        "hover:bg-blue-50/80 hover:text-blue-700",
        "focus:ring-2 focus:ring-blue-200 focus:outline-none",
        "data-[selected-single=true]:bg-blue-600 data-[selected-single=true]:text-white data-[selected-single=true]:shadow-md data-[selected-single=true]:shadow-blue-200",
        "data-[range-middle=true]:bg-blue-50 data-[range-middle=true]:text-blue-900",
        "data-[range-start=true]:bg-blue-600 data-[range-start=true]:text-white data-[range-start=true]:rounded-l-xl",
        "data-[range-end=true]:bg-blue-600 data-[range-end=true]:text-white data-[range-end=true]:rounded-r-xl",
        defaultClassNames.day,
        className
      )}
      {...props}
    >
      {content}
    </Button>
  )
}

