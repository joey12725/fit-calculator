"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";

const schema = z.object({
  email: z.string().email(),
  consent: z.boolean().refine(val => val === true, {
    message: "Required",
  }),
});

type FormData = z.infer<typeof schema>;

export default function StartPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });
  const [success, setSuccess] = useState(false);

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/user/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email }),
    });
    if (res.ok) {
      setSuccess(true);
      router.push("/scan");
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div>
        <label>
          Email
          <input
            type="email"
            aria-invalid={errors.email ? "true" : "false"}
            {...register("email")}
            className="border"
          />
        </label>
        {errors.email && <p role="alert">{errors.email.message}</p>}
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" {...register("consent")}/>
        I agree
      </label>
      <button type="submit" disabled={isSubmitting} className="bg-brand text-white p-2">
        {isSubmitting ? "Submitting..." : "Start"}
      </button>
      {success && <p>Success!</p>}
    </form>
  );
}
