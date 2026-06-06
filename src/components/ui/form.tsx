"use client"

import * as React from "react"
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
  type ControllerRenderProps,
  type ControllerFieldState,
  type UseFormStateReturn,
  type UseFormReturn,
} from "react-hook-form"
import { cn } from "@/lib/utils"

function Form<TFormValues extends FieldValues>(
  props: React.FormHTMLAttributes<HTMLFormElement> & {
    form: UseFormReturn<TFormValues>
  }
) {
  const { className, form, ...rest } = props
  return (
    <form noValidate className={cn("space-y-4", className)} {...rest} />
  )
}

function FormField<
  TFormValues extends FieldValues,
  TName extends Path<TFormValues>
>(props: {
  control: Control<TFormValues>
  name: TName
  render: (props: {
    field: ControllerRenderProps<TFormValues, TName>
    fieldState: ControllerFieldState
    formState: UseFormStateReturn<TFormValues>
  }) => React.ReactNode
}) {
  const { control, name, render } = props
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState, formState }) => <>{render({ field, fieldState, formState })}</>}
    />
  )
}

function FormItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2", className)} {...props} />
}

function FormLabel({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  )
}

function FormControl({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />
}

function FormMessage({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-destructive", className)} {...props} />
  )
}

export { Form, FormField, FormItem, FormLabel, FormControl, FormMessage }
