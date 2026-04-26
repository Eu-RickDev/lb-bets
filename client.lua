local identifier = "cdbets"

while GetResourceState("lb-phone") ~= "started" do
    Wait(500)
end

local function addApp()
    local added, errorMessage = exports["lb-phone"]:AddCustomApp({
        identifier = identifier,

        name = "CDBets",
        description = "Cassino premium — Slots, Roleta e Mines",
        developer = "CDBets",

        defaultApp = false,
        size = 60000,

        ui = GetCurrentResourceName() .. "/ui/index.html",

        icon = "https://cfx-nui-" .. GetCurrentResourceName() .. "/ui/assets/app-icon.png",

        fixBlur = true
    })

    if not added then
        print("Could not add CDBets app:", errorMessage)
    end
end

addApp()

AddEventHandler("onResourceStart", function(resource)
    if resource == "lb-phone" then
        addApp()
    end
end)
