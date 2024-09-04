"use client";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import PrismaTypes from "@prisma/client";
import {
  BadgeCheck,
  Flag,
  Heart,
  LoaderCircle,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Session } from "next-auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteThread } from "../action/deleteThread.action";
import { like } from "../action/like.action";
import { notification } from "../action/notification.action";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

type ThreadWithAuthor = PrismaTypes.Thread & {
  author: PrismaTypes.User;
  likes: PrismaTypes.Like[];
};

type ThreadWithAuthorAndComments = ThreadWithAuthor & {
  comments: PrismaTypes.Comment[];
};

export const Threads = ({
  threads,
  session,
  loading,
}: {
  threads: ThreadWithAuthorAndComments[];
  session: Session | null;
  loading?: boolean | undefined;
}) => {
  const router = useRouter();
  const [threadsUpdated, setThreadsUpdated] = useState(threads);
  const [isAnimating, setIsAnimating] = useState({
    status: false,
    threadId: "",
  });

  useEffect(() => {
    setThreadsUpdated(threads);
  }, [threads]);

  const handleDelete = async (threadId: string) => {
    if (!session) return;
    const updatedThreads = threadsUpdated.filter(
      (thread) => thread.id !== threadId
    );
    setThreadsUpdated(updatedThreads);
    await deleteThread(threadId);
  };

  const handleLike = async (threadId: string, userId: string) => {
    if (!session) return;
    setIsAnimating({
      status: true,
      threadId,
    });

    setThreadsUpdated((prevThreads) =>
      prevThreads.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              likes: thread.likes.some(
                (like) => like.userId === session.user.id
              )
                ? thread.likes.filter((like) => like.userId !== session.user.id)
                : [
                    ...thread.likes,
                    {
                      id: "temp-id",
                      threadId: thread.id,
                      userId: session.user.id,
                      createdAt: new Date(),
                    },
                  ],
            }
          : thread
      )
    );
    setTimeout(() => {
      setIsAnimating({
        status: false,
        threadId,
      });
    }, 250);
    const likeState = await like(session?.user.id as string, threadId);
    if (likeState) {
      notification(session?.user.id as string, userId, "like", threadId);
    }
  };

  return (
    <main
      className={`flex flex-col items-center justify-center md:w-full h-full first:pt-2 ${
        loading ? "last:pb-24" : "last:pb-11"
      }`}
    >
      {threadsUpdated.map((post) => (
        <div
          key={post.id}
          className="flex flex-col items-center justify-center w-full hover:bg-background/70 cursor-pointer z-30 p-1"
        >
          <div className="flex flex-row items-center justify-center w-full gap-2 border-b-2">
            <Image
              onClick={() => {
                router.push(`/user/${post.author.username}`);
              }}
              src={
                post.author.image
                  ? post.author.image
                  : "https://i0.wp.com/www.repol.copl.ulaval.ca/wp-content/uploads/2019/01/default-user-icon.jpg?ssl=1"
              }
              alt="author avatar"
              width={1000}
              height={1000}
              className="rounded-full size-10 self-start"
            />
            <div className="flex flex-col items-start justify-center w-full relative">
              <div className="flex flex-row w-full gap-40 md:gap-64">
                <span
                  onClick={() => {
                    router.push(`/user/${post.author.username}`);
                  }}
                  className="text-sm font-bold dark:text-white text-black relative w-auto"
                >
                  {post.author.name}
                  {post.author.verified ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <BadgeCheck className="inline-block size-4 ml-1 mb-1 text-blue-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This user is verified by F'Threads</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                </span>
                <div className="flex flex-row items-center gap-2">
                  <span className="text-xs text-gray-500 relative top-1">
                    {formatRelativeTime(new Date(post.createdAt))} ago
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="relative top-1">
                      <MoreHorizontal className="size-5 text-gray-400" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {post.authorId === session?.user.id ||
                      session?.user.role === "ADMIN" ? (
                        <div>
                          <DropdownMenuItem>
                            <Pencil className="size-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(post.id)}
                          >
                            <Trash2 className="size-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </div>
                      ) : null}
                      <DropdownMenuItem>
                        <Flag className="size-4 mr-2" />
                        Report
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <span
                onClick={() => router.push(`/threads/${post.id}`)}
                className="text-sm dark:text-white text-black w-72 pb-1 md:w-80 overflow-hidden whitespace-normal break-words z-40"
              >
                {post.content.split(/\s+/).map((word, index) => {
                  if (word.startsWith("#")) {
                    return (
                      <span
                        key={index}
                        className="text-blue-500 cursor-pointer z-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/hashtag/${word.slice(1)}`);
                        }}
                      >
                        {word}{" "}
                      </span>
                    );
                  } else if (word.startsWith("@")) {
                    return (
                      <span
                        key={index}
                        className="text-blue-500 cursor-pointer z-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/user/@${word.slice(1)}`);
                        }}
                      >
                        {word}{" "}
                      </span>
                    );
                  } else if (
                    word.startsWith("https://") ||
                    word.startsWith("http://")
                  ) {
                    return (
                      <a
                        key={index}
                        href={word}
                        onClick={(e) => e.stopPropagation()}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-500 cursor-pointer z-50"
                      >
                        {word}{" "}
                      </a>
                    );
                  } else {
                    return <span key={index}>{word} </span>;
                  }
                })}
              </span>
              {post.image ? (
                <div className="w-full h-52">
                  <AlertDialog>
                    <AlertDialogTrigger className="w-auto rounded-full">
                      <Image
                        src={post?.image || "/default.png"}
                        alt="post image preview"
                        width={1000}
                        height={1000}
                        className="w-80 h-52 object-cover rounded-xl"
                      />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <Image
                        src={post?.image || "/default.png"}
                        alt="post image full size"
                        width={2000}
                        height={2000}
                        className="w-full"
                      />
                      <AlertDialogCancel className="w-auto h-auto">
                        <X />
                      </AlertDialogCancel>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : null}
              <div className="flex flex-row items-center justify-start gap-2 pt-0.5 w-full">
                <div className="w-auto h-auto">
                  <Heart
                    onClick={() => handleLike(post.id, post.authorId)}
                    className={`size-5 transition-transform duration-300 ${
                      isAnimating.threadId === post.id && isAnimating.status
                        ? "scale-125"
                        : "scale-100"
                    } ${
                      post.likes.find(
                        (like) => like.userId === session?.user.id
                      ) !== undefined
                        ? "text-[#ff0000]"
                        : "dark:text-white"
                    }`}
                    fill={
                      post.likes.find(
                        (like) => like.userId === session?.user.id
                      ) !== undefined
                        ? "red"
                        : "none"
                    }
                  />
                </div>
                <div>
                  <span className="text-gray-500">‧</span>
                </div>
                <div>
                  <MessageSquare
                    className="size-5 dark:text-white relative top-[0.5px]"
                    onClick={() => router.push(`/threads/${post.id}`)}
                  />
                </div>
              </div>
              <div className="flex flex-row items-center justify-start gap-1 pt-0.5 pb-3 w-full">
                <div>
                  <span className="text-xs text-gray-500 relative top-px">
                    {post.likes.length} like{post.likes.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 relative top-1">‧</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 relative top-px">
                    {post.comments.length} comment
                    {post.comments.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      {loading ? (
        <div className="flex flex-row items-center justify-center w-full h-10">
          <span className="text-sm dark:text-white text-black">
            <LoaderCircle className="size-6 animate-spin" />
          </span>
        </div>
      ) : null}
    </main>
  );
};
