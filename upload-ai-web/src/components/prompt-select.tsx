import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { api } from "@/lib/axios";

type Prompt = {
    id: string,
    title: string,
    template: string
}

type PromptSelectProps = {
    onPromptSelect: (template: string) => void;
}

export function PromptSelect({onPromptSelect}: PromptSelectProps) {
    const [prompts, setPrompts] = useState<Prompt[] | null>(null)

    useEffect(() => {
        api.get("/prompts").then(res => {
            setPrompts(res.data)
        })
    }, [])

    function handlePromptSelected(promptId: string) {
        const selectedPrompt = prompts?.find(p => p.id === promptId)

        if(!selectedPrompt)
            return

        onPromptSelect(selectedPrompt.template)
    }

    return (
        <Select onValueChange={handlePromptSelected}>
            <SelectTrigger>
            <SelectValue placeholder="Selecione um prompt..."/>
            </SelectTrigger>
            <SelectContent>
                {prompts?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
                </SelectContent>
        </Select>
    )
}