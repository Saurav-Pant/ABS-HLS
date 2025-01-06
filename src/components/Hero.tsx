"use client";

import React, { useState } from "react";
import { Alert, AlertTitle, AlertDescription } from "../components/ui/alert";
import { FileText } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { BorderBeam } from "../components/ui/border-beam";
// import TymelyPreview from "../../public/Preview.png";
import { useToast } from "../hooks/use-toast";
import ShimmerButton from "./ui/shimmer-button";

const Hero = () => {
  const { toast } = useToast();

//   const { data: session } = useSession();
const {data:session} = "useSession" as any;
  const isLoggedIn = session?.user ? true : false;


  return (
    <>
      <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 mb-10">
        <div className="mx-4 mb-20 mt-12 hover:shadow-md transition-all duration-300 ease-in-out">
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertTitle>Attention!</AlertTitle>
            <AlertDescription>
              Create professional proposals in seconds with this generator
            </AlertDescription>
          </Alert>
        </div>
        {isLoggedIn ? (
          <Link href="/Create-Proposal">
            <ShimmerButton>
              Create Proposal
            </ShimmerButton>
          </Link>
        ) : (
          <ShimmerButton
            onClick={() => {
              toast({
                title: "Please Login",
                description: "You need to login to generate a proposal.",
                duration: 2000,
              })
            }}
          >
            Generate Proposal
          </ShimmerButton>
        )}

        <h1 className="max-w-4xl text-5xl md:text-6xl lg:text-6xl font-bold mb-4 sm:mb-5 text-center mt-4">
          Craft Winning
          <span className="text-teal-600 block sm:inline sm:ml-3">
            Proposals
          </span>
        </h1>
        <p className="text-sm sm:text-base lg:text-lg mb-6 font-normal text-center max-w-2xl">
          Our efficient tool helps you generate professional proposals quickly, enabling you to win clients and secure deals effortlessly.
        </p>
        <div className="relative rounded-xl mx-2 mt-20 overflow-hidden">
          {/* <Image
            src={TymelyPreview}
            alt='Tymely Preview'
            width={1015}
            className="border rounded-xl"
          /> */}
          <BorderBeam size={250} duration={12} delay={0} />
        </div>
      </div>
    </>
  );
};

export default Hero;
