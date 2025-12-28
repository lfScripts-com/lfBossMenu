local ESX
if Config and Config.ESXMode == 'old' then
	ESX = ESX or nil
	TriggerEvent('esx:getSharedObject', function(obj) ESX = obj end)
else
	ESX = exports["es_extended"]:getSharedObject()
end

Locales = Locales or {}
local Locale = Config.Locale or 'fr'

function _U(key, ...)
    local locale = Locales[Locale] or Locales['fr']
    if locale[key] then
        return string.format(locale[key], ...)
    end
    return 'Translation [' .. Locale .. '][' .. key .. '] not found'
end

local isUIOpen = false
local currentJob = nil

Citizen.CreateThread(function()
    while ESX.GetPlayerData().job == nil do
        Citizen.Wait(10)
    end

    ESX.PlayerData = ESX.GetPlayerData()
    currentJob = ESX.PlayerData.job.name
end)

RegisterNetEvent('esx:playerLoaded')
AddEventHandler('esx:playerLoaded', function(playerData)
    ESX.PlayerData = playerData
    currentJob = playerData.job.name
end)

RegisterNetEvent('esx:setJob')
AddEventHandler('esx:setJob', function(job)
    ESX.PlayerData.job = job
    currentJob = job.name
end)

function OpenBossMenu()
    currentJob = ESX.PlayerData.job.name

    isUIOpen = true
    SetNuiFocus(true, true)

    local jobColors = Config.JobColors[currentJob] or {
        primary = "#2c3e50",
        secondary = "#34495e",
        button = "#27ae60",
        buttonHover = "#2ecc71",
    }

    local translations = {}
    local locale = Locales[Locale] or Locales['fr']
    for k, v in pairs(locale) do
        translations[k] = v
    end

    SendNUIMessage({
        action = 'open',
        job = currentJob,
        colors = jobColors,
        locale = translations
    })
end

function CloseBossMenu()
    isUIOpen = false
    SetNuiFocus(false, false)
    SendNUIMessage({
        action = 'close'
    })
end

Citizen.CreateThread(function()
    while true do
        local time = 750
        local playerPed = PlayerPedId()
        local playerPos = GetEntityCoords(playerPed)

        if not isUIOpen and ESX.PlayerData and ESX.PlayerData.job and ESX.PlayerData.job.grade_name == 'boss' then
            for jobName, coords in pairs(Config.BossLocations) do
                local dist = #(playerPos - vector3(coords.x, coords.y, coords.z))
                if dist <= 10 and currentJob == jobName then
                    time = 1
                    DrawMarker(25, coords.x, coords.y, coords.z - 0.98,
                        0, 0, 0, 0, 0, 0,
                        0.5, 0.5, 0.5,
                        0, 0, 255, 80,
                        false, true, 2, false, false, false, false)
                    if dist <= 1.5 then
                        ESX.ShowHelpNotification(_U('help_open_menu'))
                        if IsControlJustPressed(0, 51) then
                            OpenBossMenu()
                        end
                    end
                end
            end
        else
            Citizen.Wait(1000)
        end

        Citizen.Wait(time)
    end
end)

RegisterNUICallback('closeUI', function(data, cb)
    CloseBossMenu()
    cb('ok')
end)

RegisterNUICallback('getDashboardData', function(data, cb)
    ESX.TriggerServerCallback('menuboss:getDashboardData', function(dashboardData)
        cb(dashboardData)
    end, currentJob)
end)

RegisterNUICallback('depositMoney', function(data, cb)
    local amount = tonumber(data.amount)
    if amount and amount > 0 then
        ESX.TriggerServerCallback('menuboss:depositMoney', function(success, message)
            cb({ success = success, message = message })
        end, amount)
    else
        cb({ success = false, message = 'Montant invalide.' })
    end
end)

RegisterNUICallback('withdrawMoney', function(data, cb)
    local amount = tonumber(data.amount)
    if amount and amount > 0 then
        ESX.TriggerServerCallback('menuboss:withdrawMoney', function(success, message)
            cb({ success = success, message = message })
        end, amount)
    else
        cb({ success = false, message = 'Montant invalide.' })
    end
end)

RegisterNUICallback('getEmployees', function(data, cb)
    ESX.TriggerServerCallback('menuboss:getEmployees', function(employees)
        cb(employees)
    end, currentJob)
end)

RegisterNUICallback('getInvoices', function(data, cb)
    ESX.TriggerServerCallback('menuboss:getInvoices', function(invoices)
        cb(invoices)
    end, currentJob)
end)


RegisterNUICallback('fireEmployee', function(data, cb)
    local identifier = data.identifier
    if identifier then
        TriggerServerEvent('menuboss:fireEmployee', identifier)
        cb({ success = true })
    else
        cb({ success = false, message = 'Employé invalide.' })
    end
end)

RegisterNUICallback('getJobGrades', function(data, cb)
    ESX.TriggerServerCallback('menuboss:getJobGrades', function(grades)
        cb(grades)
    end, currentJob)
end)

RegisterNUICallback('updateSalary', function(data, cb)
    local grade = tonumber(data.grade)
    local salary = tonumber(data.salary)
    if grade and salary then
        TriggerServerEvent('menuboss:updateSalary', grade, salary)
        cb({ success = true })
    else
        cb({ success = false, message = 'Données invalides.' })
    end
end)

RegisterNUICallback('updateEmployeeGrade', function(data, cb)
    local identifier = data.identifier
    local grade = tonumber(data.grade)
    if identifier and grade then
        TriggerServerEvent('menuboss:updateEmployeeGrade', identifier, grade)
        cb({ success = true })
    else
        cb({ success = false, message = 'Données invalides.' })
    end
end)

RegisterNUICallback('getVehicles', function(data, cb)
    ESX.TriggerServerCallback('menuboss:getVehicles', function(vehicles)
        cb(vehicles)
    end, currentJob)
end)

RegisterNUICallback('sellVehicle', function(data, cb)
    local vehiclePlate = data.plate
    if vehiclePlate then
        ESX.TriggerServerCallback('menuboss:sellVehicle', function(success, message)
            cb({ success = success, message = message })
        end, vehiclePlate, currentJob)
    else
        cb({ success = false, message = 'Véhicule invalide.' })
    end
end)

RegisterNUICallback('getVehicleLabel', function(data, cb)
    local model = data.model
    if type(model) == 'string' then
        model = GetHashKey(model)
    end
    local display = GetDisplayNameFromVehicleModel(model)
    local label = GetLabelText(display)
    if label == nil or label == 'NULL' or label == display then
        label = display
    end
    cb(label)
end)
