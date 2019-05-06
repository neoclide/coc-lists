# coc-lists

Some basic list sources for [coc.nvim](https://github.com/neoclide/coc.nvim/)

Including:

- [x] `files` search files from current cwd.
- [x] `mru` most recent used files.
- [x] `grep` grep text from current cwd.
- [x] `words` search word in current buffer.
- [x] `locationlist` items from vim's location list.
- [x] `quickfix` items from vim's quickfix list.
- [x] `buffers` current buffer list.
- [x] `helptags` helptags of vim.
- [x] `tags` search tag files.
- [x] `filetypes` file types.
- [x] `colors` colors schemes.
- [x] `marks` marks of vim.
- [x] `windows` windows of vim.
- [x] `vimcommands` available vim commands.
- [x] `maps` key mappings.
- [x] `cmdhistory` history of commands.
- [x] `searchhistory` history of search.

For snippets list, use [coc-snippets](https://github.com/neoclide/coc-snippets).

For git related list, use [coc-git](https://github.com/neoclide/coc-git).

For yank history, use [coc-yank](https://github.com/neoclide/coc-yank).

## Features

- Match for filename would be prefered.
- Match for start character of path segment would be prefered.
- Files are sorted by mru when score is same.
- Grep source use literal string by default.

## Install

In your vim/neovim, run command:

```
:CocInstall coc-lists
```

## Options

Type `lists.source` to in coc-settings.json to get available options.

Type `?` on normal mode to get detail help of current list.

## Commands

- `mru.validate` remove none exists files from mru list.
- `tags.generate` generate tags of current project (in current cwd).

## F.A.Q

Q: How to make grep easier?

A: Create custom command like:

```vim
command! -nargs=+ -complete=custom,s:GrepArgs Rg exe 'CocList grep '.<q-args>

function! s:GrepArgs(...)
  let list = ['-S', '-smartcase', '-i', '-ignorecase', '-w', '-word',
        \ '-e', '-regex', '-u', '-skip-vcs-ignores', '-t', '-extension']
  return join(list, "\n")
endfunction
```

Q: How to grep by motion?

A: Create custom keymappings like:

```vim
vnoremap <leader>g :<C-u>call <SID>GrepFromSelected(visualmode())<CR>
nnoremap <leader>g :<C-u>set operatorfunc=<SID>GrepFromSelected<CR>g@

function! s:GrepFromSelected(type)
  let saved_unnamed_register = @@
  if a:type ==# 'v'
    normal! `<v`>y
  elseif a:type ==# 'char'
    normal! `[v`]y
  else
    return
  endif
  let word = substitute(@@, '\n$', '', 'g')
  let word = escape(word, '| ')
  let @@ = saved_unnamed_register
  execute 'CocList grep '.word
endfunction
```

Q: How to grep current word in current buffer?

A: Create kep-mapping like:

```vim
nnoremap <silent> <space>w  :exe 'CocList -I --normal --input='.expand('<cword>').' words'<CR>
```

## License

MIT
