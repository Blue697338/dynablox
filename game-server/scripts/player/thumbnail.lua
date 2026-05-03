local jobId = "InsertJobIdHere";
local userId = 65789275746246;
local mode = "R6";
local baseURL = "http://localhost:5000";
local uploadURL = "UPLOAD_URL_HERE";
local ScriptContext = game:GetService("ScriptContext");
local Lighting = game:GetService('Lighting');
local RunService = game:GetService('RunService');
local ContentProvider = game:GetService('ContentProvider');
local HttpService = game:GetService("HttpService");
local ThumbnailGenerator = game:GetService('ThumbnailGenerator');
local Players = game:GetService("Players");
game:GetService('StarterGui'):SetCoreGuiEnabled(Enum.CoreGuiType.All, false);
game:GetService('ThumbnailGenerator').GraphicsMode = 2;
HttpService.HttpEnabled = true;
ScriptContext.ScriptsDisabled = true
Lighting.Outlines = false
ContentProvider:SetBaseUrl('http://localhost:5000')
game:GetService("InsertService"):SetAssetUrl(baseURL .. "/asset/?id=%d")
game:GetService("InsertService"):SetAssetVersionUrl(baseURL .. "/Asset/?assetversionid=%d")
local Insert = game:GetService("InsertService")

local function applyMesh(Player, children, limb)
    local ok, msg = pcall(function() 
        local specialMesh = children[1]
        local head = Player.Character[limb]
        local m = head:FindFirstChild("Mesh")
        if not m then
            m = Instance.New("SpecialMesh")
            m.Parent = head
        end
        -- set
        m.Scale = specialMesh.Scale
        m.TextureId = specialMesh.TextureId
        m.MeshId = specialMesh.MeshId
        m.MeshType = specialMesh.MeshType
        m.VertexColor = specialMesh.VertexColor
    end)
    if not ok then
        print("error loading mesh", msg)
    end
end

local function applyPackage(Player, children)
    local ok, msg = pcall(function() 
        print("applyPackage children", children, #children)
        for _, asset in pairs(children) do
            print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!Child package",asset)
            if asset:IsA("Accoutrement") then
                -- For hats/accessories, parent the Accoutrement itself
                asset.Parent = Player.Character
            else
                -- For other packages, parent the children
                asset.Parent = Player.Character
            end
        end
    end)
    if not ok then
        print("error loading package", msg)
    end
end

    local function render(id)
        -- game.StarterPlayer.GameSettingsAvatarType = Enum.GameAvatarType.R15
        local Player = Players:CreateLocalPlayer(id)
        -- Player.CharacterAppearance = "http://localhost/Asset/AvatarAccoutrements.ashx?userId=1127502";
        Player:LoadCharacter()

        local av = HttpService:JSONDecode('JSON_AVATAR')

        --[[
        if av.playerAvatarType == 'R15' then
            local Character = Insert:LoadAsset(1664543044).Player
            Character.Parent = game.Workspace
            print('char len', #Character:GetChildren())
            local Humanoid = Character.Humanoid
            Player.Character = Character
            local hrp = Player.Character.HumanoidRootPart
            hrp.Anchored = true
        end
        ]]--


        -- this returns data in an identical format to https://avatar.roblox.com/v1/users/1/avatar
        -- Player.Character['Right Leg']:Destroy()
        local done = 0
        for _, asset in pairs(av.assets) do
            print('[debug] add',asset.name,'to char')
            coroutine.wrap(function()
                local ok, Asset = pcall(function()
                    return Insert:LoadAsset(asset.id)
                end)
                if ok == false then
                    done = done + 1;
                    print("[debug] asset load fail for",asset.id,Asset)
                    return
                end
                local children = Asset:GetChildren()

                if asset.assetType.id == 17 then
                    applyMesh(Player, children, "Head")
                end
                if asset.assetType.id == 27 or asset.assetType.id == 28 or asset.assetType.id == 29 or asset.assetType.id == 30 or asset.assetType.id == 31 then
                    applyPackage(Player, children)
                elseif asset.assetType.id == 8 or asset.assetType.id == 41 or asset.assetType.id == 42 or asset.assetType.id == 43 or asset.assetType.id == 44 or asset.assetType.id == 45 or asset.assetType.id == 46 or asset.assetType.id == 47 then
                    -- Handle accessories/hats (asset types 8, 41-47)
                    applyPackage(Player, children)
                else
                    for _, item in pairs(children) do
                        print('[debug] add ',asset.Name, '/', item.Name,'to char (type =',asset.assetType.id,')')
                        if asset.assetType.id == 31 then
                            print('[debug] Got right leg cl is',item.ClassName)
                        end
                        if asset.assetType.id == 18 then
                            local head = Player.Character.Head
                            if head:FindFirstChild("face") ~= nil then
                                head.face:Destroy()
                            end
                            item.Name = "face"
                            item.Parent = head
                        else
                            item.Parent = Player.Character
                        end
                    end
                end

                done = done + 1;
            end)()
        end
        repeat wait() until done == #av.assets
        print("[debug] set body colors")
        local bc = av.bodyColors;
        local colors = {
            ['Head']      = bc.headColorId,
            ['Torso']     = bc.torsoColorId,
            ['Left Arm']  = bc.leftArmColorId,
            ['Right Arm'] = bc.rightArmColorId,
            ['Left Leg']  = bc.leftLegColorId,
            ['Right Leg'] = bc.rightLegColorId
        }

        -- Map color IDs to RGB values
        local colorMap = {
            [364] = Color3.fromRGB(90, 76, 66),      -- Dark taupe
            [217] = Color3.fromRGB(124, 92, 70),     -- Brown
            [359] = Color3.fromRGB(175, 148, 131),   -- Linen
            [18] = Color3.fromRGB(204, 142, 105),    -- Nougat
            [125] = Color3.fromRGB(234, 184, 146),   -- Light orange
            [361] = Color3.fromRGB(86, 66, 54),      -- Dirt brown
            [192] = Color3.fromRGB(105, 64, 40),     -- Reddish brown
            [351] = Color3.fromRGB(188, 155, 93),    -- Cork
            [352] = Color3.fromRGB(199, 172, 120),   -- Burlap
            [5] = Color3.fromRGB(215, 197, 154),     -- Brick yellow
            [153] = Color3.fromRGB(149, 121, 119),   -- Sand red
            [1007] = Color3.fromRGB(163, 75, 75),    -- Dusty Rose
            [101] = Color3.fromRGB(218, 134, 122),   -- Medium red
            [1025] = Color3.fromRGB(255, 201, 201),  -- Pastel orange
            [330] = Color3.fromRGB(255, 152, 220),   -- Carnation pink
            [135] = Color3.fromRGB(116, 134, 157),   -- Sand blue
            [305] = Color3.fromRGB(82, 154, 174),    -- Steel blue
            [11] = Color3.fromRGB(128, 187, 220),    -- Pastel Blue
            [1026] = Color3.fromRGB(177, 167, 255),  -- Pastel violet
            [321] = Color3.fromRGB(167, 94, 155),    -- Lilac
            [107] = Color3.fromRGB(0, 143, 156),     -- Bright bluish green
            [310] = Color3.fromRGB(91, 154, 76),     -- Shamrock
            [317] = Color3.fromRGB(124, 156, 107),   -- Moss
            [29] = Color3.fromRGB(161, 196, 140),    -- Medium green
            [105] = Color3.fromRGB(226, 155, 64),    -- Br. yellowish orange
            [24] = Color3.fromRGB(245, 205, 48),     -- Bright yellow
            [334] = Color3.fromRGB(248, 217, 109),   -- Daisy orange
            [199] = Color3.fromRGB(99, 95, 98),      -- Dark stone grey
            [1002] = Color3.fromRGB(205, 205, 205),  -- Mid gray
            [1001] = Color3.fromRGB(248, 248, 248),  -- Institutional white
        }

        for part, colorId in pairs(colors) do
            if Player.Character:FindFirstChild(part) then
                local rgb = colorMap[colorId]
                if rgb then
                    Player.Character[part].Color = rgb
                else
                    -- Fallback to BrickColor if not in map
                    Player.Character[part].BrickColor = BrickColor.new(colorId)
                end
            else
                print("[warning] could not find",part,"in player")
            end
        end

        for _, object in pairs(Player.Character:GetChildren()) do
            if object:IsA('Tool') then
                print("Player has gear, raise the right arm out.")
                Player.Character.Torso['Right Shoulder'].CurrentAngle = math.rad(90)
            end
        end

        --[[
        local guy = Player.Character
        guy.Head.Mesh:remove()
        guy.Torso:remove()
        guy['Right Arm']:remove()
        guy['Left Arm']:remove()
        guy['Right Leg']:remove()
        guy['Left Leg']:remove()
        ]]--
        
        -- local humanoid = Player.Character.Humanoid
        -- humanoid:BuildRigFromAttachments()
        print("[debug] render avatar")
        local hasCam = game.Workspace:GetChildren()[1];
        if hasCam ~= nil then
            if hasCam:FindFirstChild("ThumbnailCamera") ~= nil then
                print("has thumbnail camera")
            else
                print("Does not have thumbnail camera")
            end
        end
        local avatarEncoded = ThumbnailGenerator:Click('png', _X_RES_, _Y_RES_, true, false)
        print("[debug] avatar render over. delete character")
        Player.Character:Destroy()
        print("[debug] [player/thumbnail] send post request containing avatar")
        local ok, data = pcall(function()
            return HttpService:PostAsync(uploadURL, HttpService:JSONEncode({
                ['thumbnail'] = avatarEncoded,
                ['userId'] = userId,
                ['accessKey'] = "AccessKey",
                ['isHeadshot'] = false,
                ['jobId'] = jobId,
            }), Enum.HttpContentType.TextPlain)
        end)
        print("[debug] post over",ok,data)
    end

coroutine.wrap(function()
    local ok, data = pcall(function()
        render(1)
    end)
    print("[player/thumbnail]", ok, data);
    print("[debug] exit game");
end)()
