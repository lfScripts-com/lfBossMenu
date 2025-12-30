fx_version 'cerulean'
game 'gta5'
lua54 'yes'
version '0.0.1'
author 'LFScripts, xLaugh, Firgyy'
escrow_ignore {
    'config.lua',
    'locales/*.lua',
    'client.lua',
    'server.lua',
}

client_scripts {
    'config.lua',
    'locales/*.lua',
    'client.lua'
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'config.lua',
    'locales/*.lua',
    'server.lua'
}

ui_page 'html/index.html'

files {
    'html/*.html',
    'html/*.css',
    'html/*.js',
    'html/images/*.webp',
    'html/images/*.png'
}
