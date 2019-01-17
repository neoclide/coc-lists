# coc-lists

Some basic list sources for [coc.nvim](https://github.com/neoclide/coc.nvim/)

Including:

- [x] `files` search files from current cwd.
- [x] `mru` most recent used files.
- [x] `grep` grep text from current cwd.
- [x] `words` search word from current buffer
- [x] `locationlist` items from vim's location list.
- [x] `quickfix` items from vim's quickfix list.
- [x] `buffers` current buffer list.

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

- `lists.disabledLists` disabled list of source names.
- `list.source.files.command` command used for search for files, should return
  file for each line, default: `rg`
- `list.source.files.args` arguments used for command, default: `['--color', 'never', '--files']`.
- `list.source.files.excludePatterns` exclud minimatch patterns for paths, default: `[]`.
- `list.source.mru.maxLength` max length for mru list, default: 1000,
- `list.source.mru.ignoreGitIgnore` ignore git ignored files, default: false,
- `list.source.mru.excludePatterns` minimatch patterns for excluded paths, default: `["**/.git/*", "/tmp/*"]`.

## Commands

- `mru.validate` remove none exists files from mru list.

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

Q: How to grep word in current buffer?

A: Create kep-mapping like:

```vim
nnoremap <silent> <space>w  :exe 'CocList -I --normal --input='.expand('<cword>').' words'<CR>
```

## License

MIT
