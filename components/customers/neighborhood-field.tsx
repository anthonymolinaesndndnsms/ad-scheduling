'use client'

import * as React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'

const OTHER = '__other__'

/**
 * Neighborhood picker: choose from the neighborhoods configured in Settings, or
 * pick "Other…" to type a free-text value. Emits the resolved string via onChange.
 */
export function NeighborhoodField({
  value,
  onChange,
  neighborhoods,
}: {
  value: string
  onChange: (value: string) => void
  neighborhoods: string[]
}) {
  const known = React.useMemo(
    () => neighborhoods.filter((n) => n.trim().length > 0),
    [neighborhoods]
  )

  // Start in "other" mode when there's a value not present in the known list.
  const [isOther, setIsOther] = React.useState(
    () => value.trim().length > 0 && !known.includes(value)
  )

  // If we have no configured neighborhoods, fall back to a plain text input.
  if (known.length === 0) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Neighborhood"
      />
    )
  }

  const selectValue = isOther ? OTHER : value || ''

  return (
    <div className="grid gap-2">
      <Select
        value={selectValue}
        onValueChange={(next) => {
          const v = (next as string) ?? ''
          if (v === OTHER) {
            setIsOther(true)
            onChange('')
          } else {
            setIsOther(false)
            onChange(v)
          }
        }}
      >
        <SelectTrigger className="w-full h-10 sm:h-8">
          <SelectValue placeholder="Select neighborhood">
            {isOther ? 'Other…' : value || 'Select neighborhood'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {known.map((n) => (
            <SelectItem key={n} value={n}>
              {n}
            </SelectItem>
          ))}
          <SelectItem value={OTHER}>Other…</SelectItem>
        </SelectContent>
      </Select>

      {isOther && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type a neighborhood"
          autoFocus
        />
      )}
    </div>
  )
}
