"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { useEffect } from 'react'

type RichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      Image,
      TextStyle,
      Color,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
  })

  // Update editor when value changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) {
    return <div className="text-sm text-slate-500">Editor laden...</div>
  }

  const addImage = () => {
    const url = window.prompt('Afbeelding URL:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const addLink = () => {
    const url = window.prompt('Link URL:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap gap-1 rounded-t-lg border border-b-0 border-slate-200 bg-slate-50 p-2">
        {/* Text Formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded px-3 py-1.5 text-sm font-bold transition-colors ${
            editor.isActive('bold') ? 'bg-slate-700 text-white' : 'hover:bg-slate-200'
          }`}
          title="Bold (Cmd+B)"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded px-3 py-1.5 text-sm italic transition-colors ${
            editor.isActive('italic') ? 'bg-slate-700 text-white' : 'hover:bg-slate-200'
          }`}
          title="Italic (Cmd+I)"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`rounded px-3 py-1.5 text-sm underline transition-colors ${
            editor.isActive('underline') ? 'bg-slate-700 text-white' : 'hover:bg-slate-200'
          }`}
          title="Underline (Cmd+U)"
        >
          U
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`rounded px-3 py-1.5 text-sm line-through transition-colors ${
            editor.isActive('strike') ? 'bg-slate-700 text-white' : 'hover:bg-slate-200'
          }`}
          title="Doorhalen"
        >
          S
        </button>

        <div className="mx-1 border-l border-slate-300" />

        {/* Headers */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`rounded px-3 py-1.5 text-sm font-bold transition-colors ${
            editor.isActive('heading', { level: 1 }) ? 'bg-slate-700 text-white' : 'hover:bg-slate-200'
          }`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`rounded px-3 py-1.5 text-sm font-bold transition-colors ${
            editor.isActive('heading', { level: 2 }) ? 'bg-slate-700 text-white' : 'hover:bg-slate-200'
          }`}
          title="Heading 2"
        >
          H2
        </button>

        <div className="mx-1 border-l border-slate-300" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`rounded px-3 py-1.5 text-sm transition-colors ${
            editor.isActive('bulletList') ? 'bg-slate-700 text-white' : 'hover:bg-slate-200'
          }`}
          title="Bullet List"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`rounded px-3 py-1.5 text-sm transition-colors ${
            editor.isActive('orderedList') ? 'bg-slate-700 text-white' : 'hover:bg-slate-200'
          }`}
          title="Numbered List"
        >
          1.
        </button>

        <div className="mx-1 border-l border-slate-300" />

        {/* Link & Image */}
        <button
          type="button"
          onClick={addLink}
          className={`rounded px-3 py-1.5 text-sm transition-colors ${
            editor.isActive('link') ? 'bg-slate-700 text-white' : 'hover:bg-slate-200'
          }`}
          title="Link toevoegen"
        >
          🔗
        </button>
        <button
          type="button"
          onClick={addImage}
          className="rounded px-3 py-1.5 text-sm transition-colors hover:bg-slate-200"
          title="Afbeelding toevoegen"
        >
          🖼️
        </button>

        <div className="mx-1 border-l border-slate-300" />

        {/* Color Picker */}
        <input
          type="color"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          className="h-8 w-8 cursor-pointer rounded border border-slate-300"
          title="Tekstkleur"
        />

        <div className="ml-auto text-xs text-slate-500">
          💡 Variabelen: {'{{'} {'}'} bijv. {'{'}klantNaam{'}'}
        </div>
      </div>

      <EditorContent 
        editor={editor} 
        className="rounded-b-lg border border-slate-200 bg-white"
      />
    </div>
  )
}
