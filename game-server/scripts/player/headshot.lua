local jobId = "InsertJobIdHere";
local userId = 65789275746246;
local mode = 'R6'
local baseURL = "http://localhost:5000";
local uploadURL = "UPLOAD_URL_HERE";

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

local function FindFirstChildWhichIsA(inst, className)
    for _, asset in pairs(inst:GetChildren()) do
        if asset.ClassName == className then
            return asset
        end
    end
    return nil
end

    local HttpService = game:GetService('HttpService')
    local ScriptContext = game:GetService('ScriptContext')
    local Lighting = game:GetService('Lighting')
    local Players = game:GetService('Players')
    local RunService = game:GetService('RunService')
    local ContentProvider = game:GetService('ContentProvider')
    local ThumbnailGenerator = game:GetService('ThumbnailGenerator')
    game:GetService('StarterGui'):SetCoreGuiEnabled(Enum.CoreGuiType.All, false)
    ThumbnailGenerator.GraphicsMode = 4; -- switch to 4 (apparently noop but all roblox code has this line so...)

    HttpService.HttpEnabled = true
    ScriptContext.ScriptsDisabled = true
    Lighting.Outlines = false
    ContentProvider:SetBaseUrl('http://localhost:5000')
    game:GetService("ContentProvider"):SetAssetUrl(baseURL .. "/Asset/")
    game:GetService("InsertService"):SetAssetUrl(baseURL .. "/Asset/?id=%d")
    pcall(function() game:GetService("ScriptInformationProvider"):SetAssetUrl(url .. "/Asset/") end)
    game:GetService("ContentProvider"):SetBaseUrl(baseURL .. "/")
    game:GetService("Players"):SetChatFilterUrl(baseURL .. "/Game/ChatFilter.ashx")
    local Insert = game:GetService("InsertService")
    game:GetService("InsertService"):SetAssetUrl(baseURL .. "/Asset/?id=%d")
	game:GetService("InsertService"):SetAssetVersionUrl(baseURL .. "/Asset/?assetversionid=%d")

    local function render(id)
        -- game.StarterPlayer.GameSettingsAvatarType = Enum.GameAvatarType.R15
        local Player = Players:CreateLocalPlayer(id)
        Player:LoadCharacter()
        -- this returns data in an identical format to https://avatar.roblox.com/v1/users/1/avatar
        local av = HttpService:JSONDecode('JSON_AVATAR')
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
                        print('[debug] add ',asset.Name, '/', item.Name,'to char')
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
            [0] = Color3.fromRGB(255, 255, 255),     -- Default to pure white
            [1] = Color3.fromRGB(255, 0, 0),         -- Bright red
            [2] = Color3.fromRGB(0, 0, 255),         -- Bright blue
            [3] = Color3.fromRGB(0, 255, 0),         -- Bright green
            [4] = Color3.fromRGB(89, 89, 89),        -- Dark stone grey
            [5] = Color3.fromRGB(255, 255, 0),       -- Bright yellow
            [6] = Color3.fromRGB(164, 164, 164),     -- Light stone grey
            [7] = Color3.fromRGB(215, 176, 41),      -- Brick yellow
            [8] = Color3.fromRGB(255, 255, 255),     -- White
            [9] = Color3.fromRGB(0, 0, 0),           -- Black
            [10] = Color3.fromRGB(42, 42, 42),       -- Dark grey
            [11] = Color3.fromRGB(128, 187, 220),    -- Pastel Blue
            [18] = Color3.fromRGB(204, 142, 105),    -- Nougat
            [24] = Color3.fromRGB(245, 205, 48),     -- Bright yellow
            [29] = Color3.fromRGB(161, 196, 140),    -- Medium green
            [101] = Color3.fromRGB(218, 134, 122),   -- Medium red
            [105] = Color3.fromRGB(226, 155, 64),    -- Br. yellowish orange
            [107] = Color3.fromRGB(0, 143, 156),     -- Bright bluish green
            [125] = Color3.fromRGB(234, 184, 146),   -- Light orange
            [135] = Color3.fromRGB(116, 134, 157),   -- Sand blue
            [153] = Color3.fromRGB(149, 121, 119),   -- Sand red
            [192] = Color3.fromRGB(105, 64, 40),     -- Reddish brown
            [199] = Color3.fromRGB(99, 95, 98),      -- Dark stone grey
            [217] = Color3.fromRGB(124, 92, 70),     -- Brown
            [305] = Color3.fromRGB(82, 154, 174),    -- Steel blue
            [310] = Color3.fromRGB(91, 154, 76),     -- Shamrock
            [317] = Color3.fromRGB(124, 156, 107),   -- Moss
            [321] = Color3.fromRGB(167, 94, 155),    -- Lilac
            [330] = Color3.fromRGB(255, 152, 220),   -- Carnation pink
            [334] = Color3.fromRGB(248, 217, 109),   -- Daisy orange
            [351] = Color3.fromRGB(188, 155, 93),    -- Cork
            [352] = Color3.fromRGB(199, 172, 120),   -- Burlap
            [359] = Color3.fromRGB(175, 148, 131),   -- Linen
            [361] = Color3.fromRGB(86, 66, 54),      -- Dirt brown
            [364] = Color3.fromRGB(90, 76, 66),      -- Dark taupe
            [1001] = Color3.fromRGB(255, 255, 255),  -- Institutional white (changed to pure white)
            [1002] = Color3.fromRGB(205, 205, 205),  -- Mid gray
            [1007] = Color3.fromRGB(163, 75, 75),    -- Dusty Rose
            [1025] = Color3.fromRGB(255, 201, 201),  -- Pastel orange
            [1026] = Color3.fromRGB(177, 167, 255),  -- Pastel violet
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
            end
        end

        for _, object in pairs(Player.Character:GetChildren()) do
            if object:IsA('Tool') then
                object:Destroy()
                -- Player.Character.Torso['Right Shoulder'].CurrentAngle = math.pi / 2
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
        
        print('use cam')
        -- cam:Destroy()
        -- cam = Instance.new("Camera", game.Workspace)
        -- cam.CameraType = Enum.CameraType.Watch
        -- cam.CameraSubject = Player.Character.Head
        print("[debug] render avatar")
        -- Player.Character.HumanoidRootPart.Anchored = true
        -- local c = game.Workspace.CurrentCamera

        local player = Player
        local FFlagNewHeadshotLighting = false
        local FFlagOnlyCheckHeadAccessoryInHeadShot = false
        local cameraOffsetX = 0
        local cameraOffsetY = 0
        local maxHatZoom = 100
        local baseHatZoom = 30


        local maxDimension = 0

        local quadratic = true


    -- Remove gear
	for _, child in pairs(player.Character:GetChildren()) do
		if child:IsA("Tool") then
			child:Destroy()
		elseif child:IsA("Accoutrement") then
            local handle = child:FindFirstChild("Handle")
			if handle then
				local attachment = FindFirstChildWhichIsA(handle, "Attachment")
                
                --legacy hat does not have attachment in it and should be considered when zoom out camera
				if not FFlagOnlyCheckHeadAccessoryInHeadShot or not attachment or headAttachments[attachment.Name] then
					local size = handle.Size / 2 + handle.Position - player.Character.Head.Position
					local xy = Vector2.new(size.x, size.y)
					if xy.magnitude > maxDimension then
						maxDimension = xy.magnitude
					end
				end
			end
		end
	end

	-- Setup Camera
	local maxHatOffset = 0.5 -- Maximum amount to move camera upward to accomodate large hats
    maxDimension = math.min(1, maxDimension / 3) -- Confine maxdimension to specific bounds

    if quadratic then
        maxDimension = maxDimension * maxDimension -- Zoom out on quadratic interpolation
    end

    local viewOffset     = player.Character.Head.CFrame * CFrame.new(cameraOffsetX, cameraOffsetY + maxHatOffset * maxDimension, 0.1) -- View vector offset from head

    local yAngle = -math.pi / 16
	
	local positionOffset = player.Character.Head.CFrame + (CFrame.Angles(0, yAngle, 0).lookVector.unit * 3) -- Position vector offset from head

    local camera = Instance.new("Camera", player.Character)-- Instance.new("Camera", player.Character)
    camera.Name = "ThumbnailCamera"
    camera.CameraType = Enum.CameraType.Scriptable
    camera.CoordinateFrame = CFrame.new(positionOffset.p, viewOffset.p)
    camera.FieldOfView = baseHatZoom + (maxHatZoom - baseHatZoom) * maxDimension
    print("cam fov",camera.FieldOfView)

	workspace.CurrentCamera = camera
    
        local avatarEncoded = ThumbnailGenerator:Click('png', _X_RES_, _Y_RES_, true, true)
        print("[debug] [player/headshot] send post request containing avatar")
        HttpService:PostAsync(uploadURL, HttpService:JSONEncode({
                ['thumbnail'] = avatarEncoded,
                ['userId'] = tostring(userId),
                ['accessKey'] = "AccessKey",
                ['isHeadshot'] = true,
                ['jobId'] = jobId,
        }), Enum.HttpContentType.ApplicationJson)
        print("[debug] post over")
    end

    local ok, data = pcall(function()
        render(userId)
    end)
    print("[player/headshot]", ok, data);

