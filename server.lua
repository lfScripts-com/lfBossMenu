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

ESX.RegisterServerCallback('menuboss:getDashboardData', function(source, cb, jobName)
    local xPlayer = ESX.GetPlayerFromId(source)
    if xPlayer.job.name ~= jobName or xPlayer.job.grade_name ~= 'boss' then
        cb(nil)
        return
    end

    exports.oxmysql:execute('SELECT money FROM addon_account_data WHERE account_name = ?', {'society_' .. jobName}, function(result)
        local societyMoney = 0
        if result[1] then
            societyMoney = result[1].money
        end

        exports.oxmysql:scalar('SELECT COUNT(*) FROM users WHERE job = ?', {jobName}, function(employeeCount)
            cb({
                money = societyMoney,
                employeeCount = employeeCount or 0,
                companyName = xPlayer.job.label
            })
        end)
    end)
end)

ESX.RegisterServerCallback('menuboss:depositMoney', function(source, cb, amount)
    local _source = source
    local xPlayer = ESX.GetPlayerFromId(_source)
    local jobName = xPlayer.job.name

    if xPlayer.getMoney() >= amount then
        xPlayer.removeMoney(amount)
        TriggerEvent('esx_addonaccount:getSharedAccount', 'society_' .. jobName, function(account)
            account.addMoney(amount)
        end)
        cb(true, 'Vous avez déposé ~g~$' .. amount)
    else
        cb(false, 'Vous n\'avez pas assez d\'argent.')
    end
end)

ESX.RegisterServerCallback('menuboss:withdrawMoney', function(source, cb, amount)
    local _source = source
    local xPlayer = ESX.GetPlayerFromId(_source)
    local jobName = xPlayer.job.name

    TriggerEvent('esx_addonaccount:getSharedAccount', 'society_' .. jobName, function(account)
        if account.money >= amount then
            account.removeMoney(amount)
            xPlayer.addMoney(amount)
            cb(true, 'Vous avez retiré ~g~$' .. amount)
        else
            cb(false, 'La société n\'a pas assez d\'argent.')
        end
    end)
end)

function GetGradeLabel(jobName, grade)
    local result = exports.oxmysql:executeSync('SELECT label FROM job_grades WHERE job_name = ? AND grade = ?', {jobName, grade})
    if result[1] then
        return result[1].label
    else
        return 'N/A'
    end
end

ESX.RegisterServerCallback('menuboss:getEmployees', function(source, cb, jobName)
    local employees = {}

    local xPlayers = ESX.GetExtendedPlayers('job', jobName)
    for _, xP in pairs(xPlayers) do
        local gradeLabel = GetGradeLabel(jobName, xP.job.grade)
        table.insert(employees, {
            name = xP.getName(),
            identifier = xP.getIdentifier(),
            grade = gradeLabel
        })
    end

    exports.oxmysql:execute('SELECT firstname, lastname, identifier, job_grade FROM users WHERE job = ?', {jobName}, function(results)
        for _, data in pairs(results) do
            local found = false
            for _, emp in pairs(employees) do
                if emp.identifier == data.identifier then
                    found = true
                    break
                end
            end
            if not found then
                local gradeLabel = GetGradeLabel(jobName, data.job_grade)
                table.insert(employees, {
                    name = data.firstname .. ' ' .. data.lastname,
                    identifier = data.identifier,
                    grade = gradeLabel
                })
            end
        end
        cb(employees)
    end)
end)

RegisterServerEvent('menuboss:fireEmployee')
AddEventHandler('menuboss:fireEmployee', function(identifier)
    local _source = source
    local xPlayer = ESX.GetPlayerFromId(_source)

    exports.oxmysql:execute('UPDATE users SET job = ?, job_grade = ? WHERE identifier = ?', {'unemployed', 0, identifier}, function(info)
        if info and info.affectedRows and info.affectedRows > 0 then
            TriggerClientEvent('esx:showNotification', _source, _U('employees_fired'))
            local target = ESX.GetPlayerFromIdentifier(identifier)
            if target then
                target.setJob('unemployed', 0)
                TriggerClientEvent('esx:showNotification', target.source, _U('server_employee_fired_you'))
            end
        else
            TriggerClientEvent('esx:showNotification', _source, _U('server_error_fire'))
        end
    end)
end)

RegisterServerEvent('menuboss:updateEmployeeGrade')
AddEventHandler('menuboss:updateEmployeeGrade', function(identifier, grade)
    local _source = source
    local xPlayer = ESX.GetPlayerFromId(_source)
    local jobName = xPlayer.job.name

    exports.oxmysql:execute('UPDATE users SET job_grade = ? WHERE identifier = ? AND job = ?', {grade, identifier, jobName}, function(info)
        if info and info.affectedRows and info.affectedRows > 0 then
            TriggerClientEvent('esx:showNotification', _source, _U('employees_grade_updated'))
            local target = ESX.GetPlayerFromIdentifier(identifier)
            if target then
                target.setJob(jobName, grade)
                TriggerClientEvent('esx:showNotification', target.source, _U('employees_grade_updated'))
            end
        else
            TriggerClientEvent('esx:showNotification', _source, _U('server_error_update_grade'))
        end
    end)
end)

ESX.RegisterServerCallback('menuboss:getJobGrades', function(source, cb, jobName)
    exports.oxmysql:execute('SELECT grade, label, salary FROM job_grades WHERE job_name = ? ORDER BY grade ASC', {jobName}, function(results)
        local grades = {}
        for _, data in pairs(results) do
            table.insert(grades, {
                grade = data.grade,
                label = data.label,
                salary = data.salary
            })
        end
        cb(grades)
    end)
end)

RegisterServerEvent('menuboss:updateSalary')
AddEventHandler('menuboss:updateSalary', function(grade, salary)
    local _source = source
    local xPlayer = ESX.GetPlayerFromId(_source)
    if not xPlayer then
        return
    end
    local jobName = xPlayer.job.name

    if xPlayer.job.grade_name ~= 'boss' then
        print(('menuboss: %s attempted to change salary without permission!'):format(xPlayer.identifier))
        return
    end

    if not grade or not salary then
        return
    end
    
    if salary < 50 then
        TriggerClientEvent('esx:showNotification', _source, _U('grades_salary_min'))
        return
    end
    
    if salary > 250 then
        TriggerClientEvent('esx:showNotification', _source, _U('grades_salary_max'))
        return
    end

    exports.oxmysql:execute('UPDATE job_grades SET salary = ? WHERE job_name = ? AND grade = ?', {salary, jobName, grade}, function(info)
        if info and info.affectedRows and info.affectedRows > 0 then
        else
            TriggerClientEvent('esx:showNotification', _source, _U('server_error_update_salary'))
        end
    end)
end)

ESX.RegisterServerCallback('menuboss:getVehicles', function(source, cb, jobName)
    local xPlayer = ESX.GetPlayerFromId(source)
    if xPlayer.job.name ~= jobName or xPlayer.job.grade_name ~= 'boss' then
        cb({})
        return
    end

    exports.oxmysql:execute('SELECT plate, vehicle, type, owner FROM owned_vehicles WHERE job = ?', {jobName}, function(results)
        local vehicles = {}
        for _, data in pairs(results) do
            local vehicleData = {}
            if data.vehicle then
                vehicleData = json.decode(data.vehicle)
            end
            table.insert(vehicles, {
                plate = data.plate,
                model = vehicleData and vehicleData.model or nil,
                vehicle = data.vehicle,
                type = data.type,
                owner = data.owner
            })
        end
        cb(vehicles)
    end)
end)

ESX.RegisterServerCallback('menuboss:sellVehicle', function(source, cb, plate, jobName)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer or xPlayer.job.name ~= jobName or xPlayer.job.grade_name ~= 'boss' then
        cb(false, 'Action non autorisée.')
        return
    end

    exports.oxmysql:execute('SELECT * FROM owned_vehicles WHERE plate = ? AND job = ?', {plate, jobName}, function(result)
        if result and result[1] then
            exports.oxmysql:execute('DELETE FROM owned_vehicles WHERE plate = ? AND job = ?', {plate, jobName}, function(info)
                if info and info.affectedRows and info.affectedRows > 0 then
                    local sellPrice = 10000
                    TriggerEvent('esx_addonaccount:getSharedAccount', 'society_' .. jobName, function(account)
                        if account then
                            account.addMoney(sellPrice)
                        end
                    end)
                    cb(true, 'Véhicule vendu avec succès !')
                else
                    cb(false, 'Impossible de supprimer ce véhicule.')
                end
            end)
        else
            cb(false, 'Le véhicule n\'existe pas ou ne vous appartient pas.')
        end
    end)
end)

ESX.RegisterServerCallback('menuboss:getInvoices', function(source, cb, jobName)
    local xPlayer = ESX.GetPlayerFromId(source)
    if xPlayer and xPlayer.job and xPlayer.job.name == jobName and xPlayer.job.grade_name == 'boss' then
        exports.oxmysql:execute('SELECT * FROM billing WHERE emitter = ? ORDER BY date DESC', {jobName}, function(invoices)
            cb(invoices)
        end)
    else
        cb({})
    end
end)
