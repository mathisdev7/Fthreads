"use client";
import Image from "next/image";
import LogoPng from "../../public/icon (2).png";

export default function Logo() {
  return (
    <Image
      src={LogoPng.src}
      alt="Logo"
      width={48}
      onClick={() => window.location.replace("/")}
      height={48}
      priority={true}
      className="size-10"
    />
  );
}
