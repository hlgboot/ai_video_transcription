import { Label } from "@radix-ui/react-label";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { FileVideo, Upload } from "lucide-react";
import React, { FormEvent, useMemo, useRef, useState } from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util"
import { api } from "@/lib/axios";

type Status = "waiting" | "converting" | "uploading" | "generating" | "success"

type VideoInputFormProps = { onVideoUploaded: (id: string) => void }

const statusMessages = {
  converting: "Convertendo...",
  uploading: "Carregando...",
  generating: "Transcrevendo...",
  success: "Sucesso!",
}

export function VideoInputForm({ onVideoUploaded }: VideoInputFormProps) {

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('waiting')

  const promptInputRef = useRef<HTMLTextAreaElement>(null)

  async function convertVideoToAudio(video: File) {
    console.log("Convert started.")

    const ffmpeg = await getFFmpeg()

    console.log(ffmpeg)

    await ffmpeg.writeFile('input.mp4', await fetchFile(video))

    // ffmpeg.on("log", l => {
    //   console.log(l)
    // })

    ffmpeg.on("progress", p => {
      console.log("Convert progress:" + Math.round(p.progress * 100))
    })

    await ffmpeg.exec([
      "-i",
      "input.mp4",
      "-map",
      "0:a", 
      "-b:a", 
      "20k",
      "-acodec",
      "libmp3lame",
      "output.mp3",
    ])

    const data = await ffmpeg.readFile("output.mp3")

    const audioFileBlob = new Blob([data], { type: "audio/mpeg" })
    const audioFile = new File([audioFileBlob], "audio.mp3", { type: "audio/mpeg" })

    console.log("Convert finished.")

    return audioFile
  }

  function handleFileSelection(e: React.ChangeEvent<HTMLInputElement>) {
    const { files } = e.currentTarget

    if(!files)
      return

    const selectedFile = files[0]

    setVideoFile(selectedFile)

  }

  async function handleUploadVideo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const prompt = promptInputRef.current?.value

    if(!videoFile)
      return

    setStatus("converting")
    const audioFile = await convertVideoToAudio(videoFile)

    const data = new FormData()

    data.append("file", audioFile)

    setStatus("uploading")
    const response = await api.post("/videos", data)

    const videoId = response.data.video.id

    setStatus("generating")
    await api.post(`/videos/${videoId}/transcription`, {
      prompt
    })

    setStatus("success")
    
    onVideoUploaded(videoId)

  }

  const previewURL = useMemo(() => {
    if(!videoFile) {return null}

    return URL.createObjectURL(videoFile)
  }, [videoFile])


  return (
      <form className="space-y-6" onSubmit={handleUploadVideo}>
      <label 
        className="relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5"
        htmlFor="video">
        {previewURL ? (
          <video src={previewURL} controls={false} className="pointer-events-none absolute inset-0" />
        ) : (
          <>
            <FileVideo/>
            Selecione um víceo
          </>
        )}
      </label>

      <input type="file" id="video" accept="video/mp4" className="sr-only" onChange={handleFileSelection}/>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="transcription_prompt">Prompt de transcrição</Label>
        <Textarea 
          id="transcription_prompt"
          disabled={status !== "waiting"}
          ref={promptInputRef} 
          className="h-20 leading-relaxed resize-none"
          placeholder="Inclua palavras chaves mencionadas no vídeo separadas por vídeo (,)"
        />
      </div>

      <Button data-success={status === "success"} disabled={status !== "waiting"} type="submit" className="w-full data-[success=true]:bg-emerald-400">
        {status === "waiting" ? (
          <>Carregar vídeo <Upload className="w-4 h-4 ml-2"/></>
        ) : statusMessages[status]}
      </Button>
      </form>
  )
}