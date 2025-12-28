fx_version 'cerulean'
game 'gta5'
lua54 'yes'

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
