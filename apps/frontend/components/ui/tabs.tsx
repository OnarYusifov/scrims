"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

const TabsContext = React.createContext<{
  activeTab?: string
}>({})

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const [activeTab, setActiveTab] = React.useState<string | undefined>(
    props.defaultValue || props.value
  )
  const tabsRef = React.useRef<HTMLDivElement>(null)
  const prevActiveTabRef = React.useRef<string | undefined>(activeTab)

  React.useEffect(() => {
    if (props.value !== undefined) {
      setActiveTab(props.value)
    }
  }, [props.value])

  React.useEffect(() => {
    // Прокручиваем к началу табов при изменении активного таба
    if (activeTab && activeTab !== prevActiveTabRef.current && tabsRef.current) {
      // Небольшая задержка, чтобы контент успел обновиться
      setTimeout(() => {
        if (tabsRef.current) {
          const tabsListElement = tabsRef.current.querySelector('[data-slot="tabs-list"]') as HTMLElement

          if (tabsListElement) {
            // Плавная прокрутка к началу списка табов с небольшим отступом
            const rect = tabsListElement.getBoundingClientRect()
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop
            const targetPosition = rect.top + scrollTop - 20 // 20px отступ сверху

            window.scrollTo({
              top: targetPosition,
              behavior: 'smooth'
            })
          }
        }
      }, 50)

      prevActiveTabRef.current = activeTab
    }
  }, [activeTab])

  return (
    <TabsContext.Provider value={{ activeTab }}>
      <TabsPrimitive.Root
        ref={tabsRef}
        data-slot="tabs"
        className={cn("flex flex-col gap-2", className)}
        onValueChange={(value) => {
          setActiveTab(value)
          props.onValueChange?.(value)
        }}
        {...props}
      />
    </TabsContext.Provider>
  )
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const { activeTab } = React.useContext(TabsContext)
  const listRef = React.useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = React.useState<{
    left: number
    width: number
  } | null>(null)

  const updateIndicator = React.useCallback(() => {
    if (!listRef.current) return

    const activeTrigger = listRef.current.querySelector(
      `[data-state="active"]`
    ) as HTMLElement
    if (!activeTrigger) {
      setIndicatorStyle(null)
      return
    }

    const listRect = listRef.current.getBoundingClientRect()
    const triggerRect = activeTrigger.getBoundingClientRect()

    setIndicatorStyle({
      left: triggerRect.left - listRect.left,
      width: triggerRect.width,
    })
  }, [])

  React.useEffect(() => {
    updateIndicator()
  }, [activeTab, updateIndicator])

  React.useEffect(() => {
    if (!listRef.current) return

    // Обновляем индикатор при изменении размеров или содержимого
    const resizeObserver = new ResizeObserver(() => {
      updateIndicator()
    })
    resizeObserver.observe(listRef.current)

    // Также обновляем при изменении DOM
    const mutationObserver = new MutationObserver(() => {
      updateIndicator()
    })
    mutationObserver.observe(listRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    })

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [updateIndicator])

  return (
    <TabsPrimitive.List
      ref={(node) => {
        if (typeof ref === "function") ref(node)
        else if (ref) ref.current = node
        listRef.current = node
      }}
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground relative inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
        className
      )}
      {...props}
    >
      {indicatorStyle && (
        <motion.div
          layout
          className="absolute z-0 rounded-md border border-border dark:border-input bg-black/20 dark:bg-white/20"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
            top: '3px',
            bottom: '3px',
            height: 'calc(100% - 6px)',
          }}
          initial={false}
          animate={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
        />
      )}
      {props.children}
    </TabsPrimitive.List>
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:!text-white focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground dark:text-muted-foreground relative z-10 inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
