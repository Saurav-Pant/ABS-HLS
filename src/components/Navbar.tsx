"use client"

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Separator } from "../components/ui/separator"
import { Button } from "../components/ui/button"
import { ArrowRight, LogOut, Leaf } from 'lucide-react'
import { signIn, signOut, useSession } from 'next-auth/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const Navbar = () => {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const LoginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const result = await signIn("google", { redirect: false })
      if (result?.ok) {
        if (session?.user) {
          await storeUser(session.user)
        }
        router.push('/')
      } else {
        console.error("Sign in failed:", result?.error)
      }
    } catch (error) {
      console.error("Error during sign in:", error)
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      storeUser(session.user)
    }
  }, [session])

  const storeUser = async (user: any) => {
    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }),
      })
      if (!response.ok) {
        throw new Error('Failed to store user')
      }
    } catch (error) {
      console.error('Error storing user:', error)
    }
  }

  return (
    <nav className="px-2 sm:px-8 md:px-12 lg:px-20 py-2">
      <div className="flex items-center justify-between px-2 sm:px-6">
        <Link href="/">
          <div className="flex items-center">
            <Leaf size={24} className='text-teal-500 sm:w-10 sm:h-10' />
            <span className="ml-1 sm:ml-2 text-sm sm:text-xl font-semibold">HLS-ABS</span>
          </div>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          {session?.user ? (
            <div className="flex items-center">
              <div className="relative">
                <Image
                  src={session.user.image || "https://randomuser.me/api/portraits/men/1.jpg"}
                  alt="User"
                  width={32}
                  height={32}
                  className="rounded-full cursor-pointer"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="ml-2">
                    <ArrowRight size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 sm:gap-2 group rounded-lg text-xs sm:text-sm"
              onClick={LoginWithGoogle}
              disabled={isLoading}
            >
              <Image src="https://www.google.com/favicon.ico" alt="Google Logo" width={12} height={12} className="sm:w-4 sm:h-4" />
              {isLoading ? 'Logging in...' : 'Get Started'}
              <ArrowRight size={12} className="transition-transform duration-300 group-hover:translate-x-1 sm:w-4 sm:h-4" />
            </Button>
          )}
        </div>
      </div>
      <Separator className="mt-2" />
    </nav>
  )
}

export default Navbar
