using System.Text.Json;
using System.Text.Json.Nodes;
using System.Data;




namespace updateImg
{
    class HttpService
    {
        public readonly HttpClient _client;
        public HttpService()
        {
            _client = new HttpClient();
            _client.DefaultRequestHeaders.UserAgent.ParseAdd(
                "WarframeRelicBot/1.0");
            _client.Timeout = TimeSpan.FromSeconds(120);
        }
        public async Task<byte[]> DownloadImageAsync(string url)
        {
            return await _client.GetByteArrayAsync(url);
        }
        public async Task<JsonNode?> FetchJson(string url)
        {
            var response = await _client.GetStringAsync(url);
            return JsonNode.Parse(response);
        }
    }

    static class StoragePath
    {
        public static readonly string PrimesFile = "../data/primes.json";
        public static readonly string EventRelicFile = "../data/varziaRelic.json";
        public static readonly string FramesOutput = "../data/frames.json";
        public static readonly string WeaponsOutput = "../data/weapons.json";
        public static readonly string pathFrameImg = "./img/frame";
        public static readonly string pathSentinelsImg = "../img/frame";
        public static readonly string pathWeaponsImg = "../img/weapon";

        


    }
    //модели данных
    class DataJson
    {
        public JsonObject? primesData { get; set; }
        public JsonObject? eventRelicData { get; set; }
    }

    class DataFrameWeapon
    {
        public HashSet<string>? newFrames { get; set; }
        public HashSet<string>? newSentinels { get; set; }
        public HashSet<string>? newWeapons { get; set; }


    }
    //разделение на категории
    class SeparateCategories
    {
        private string _primesFile = StoragePath.PrimesFile;
        private string _eventRelicFile = StoragePath.EventRelicFile;
        private string _framesOutput = StoragePath.FramesOutput;
        private string _weaponsOutput = StoragePath.WeaponsOutput;

        private readonly DataJson _dataJson;
        private readonly DataFrameWeapon _dataFrameWeapon;

        JsonSerializerOptions options = new JsonSerializerOptions { WriteIndented = true };

        public SeparateCategories(DataJson dataJson, DataFrameWeapon dataFrameWeapon)
        {
            _dataJson = dataJson;
            _dataFrameWeapon = dataFrameWeapon;

        }

        static readonly string[] FrameParts = { "neuroptics", "systems", "chassis", "blueprint" };


        public JsonObject ReadJson(string path)
        {
            try
            {
                string text = File.ReadAllText(path);
                return JsonNode.Parse(text)?.AsObject() ?? new JsonObject();
            }
            catch
            {
                return new JsonObject();
            }
        }

        static int CountFrameParts(JsonArray items)
        {
            var found = new HashSet<string>();

            foreach (var node in items)
            {
                string itemName = node?["item"]?.GetValue<string>()?.ToLower() ?? "";
                foreach (string part in FrameParts)
                {
                    if (itemName.Contains(part))
                    {
                        found.Add(part);
                        break;
                    }
                }
            }

            return found.Count;
        }


        static void MergeSection(JsonObject? section, Dictionary<string, List<JsonNode>> allParts)
        {
            if (section is null) return;

            foreach (var kv in section)
            {
                if (kv.Value is not JsonArray arr) continue;

                if (!allParts.TryGetValue(kv.Key, out var list))
                {
                    list = new List<JsonNode>();
                    allParts[kv.Key] = list;
                }

                foreach (var item in arr)
                    if (item is not null) list.Add(item);
            }
        }

        public void Separate()
        {
            _dataJson.primesData = ReadJson(_primesFile);
            _dataJson.eventRelicData = ReadJson(_eventRelicFile);

            //Собираем все parts каждого предмета из всех источников
            var allItemsParts = new Dictionary<string, List<JsonNode>>();

            MergeSection(_dataJson.primesData["current"]?.AsObject(), allItemsParts);
            MergeSection(_dataJson.primesData["added"]?.AsObject(), allItemsParts);

            //пропускаем служебные поля
            var skipKeys = new HashSet<string> { "status", "varziaPeriod" };
            foreach (var kv in _dataJson.eventRelicData)
            {
                if (skipKeys.Contains(kv.Key) || kv.Value is not JsonArray arr) continue;

                if (!allItemsParts.TryGetValue(kv.Key, out var list))
                {
                    list = new List<JsonNode>();
                    allItemsParts[kv.Key] = list;
                }

                foreach (var item in arr)
                    if (item is not null) list.Add(item);
            }

            //Классифицируем каждый предмет
            var frames = new HashSet<string>();
            var sentinels = new HashSet<string>();
            var weapons = new HashSet<string>();

            foreach (var kv in allItemsParts)
            {
                var arr = new JsonArray(kv.Value.Select(n => n?.DeepClone()).ToArray());
                int partCount = CountFrameParts(arr);

                if (partCount >= 3) frames.Add(kv.Key);
                else if (partCount == 2) sentinels.Add(kv.Key);
                else weapons.Add(kv.Key);
            }

            //Загружаем существующие данные
            var existingFrames = ReadJson(_framesOutput);
            var existingWeapons = ReadJson(_weaponsOutput);

            var prevFrames = existingFrames["frames"]?.AsArray()
                                    .Select(n => n!.GetValue<string>()) ?? Enumerable.Empty<string>();
            var prevSentinels = existingFrames["sentinels"]?.AsArray()
                                   .Select(n => n!.GetValue<string>()) ?? Enumerable.Empty<string>();
            var prevWeapons = existingWeapons["weapons"]?.AsArray()
                                   .Select(n => n!.GetValue<string>()) ?? Enumerable.Empty<string>();

            var newFrames = new HashSet<string>(frames.Concat(prevFrames));
            var newSentinels = new HashSet<string>(sentinels.Concat(prevSentinels));
            var newWeapons = new HashSet<string>(weapons.Concat(prevWeapons));
            //запись данных lдля изображений
            _dataFrameWeapon.newFrames = new HashSet<string>(frames.Except(prevFrames));
            _dataFrameWeapon.newSentinels = new HashSet<string>(sentinels.Except(prevSentinels));
            _dataFrameWeapon.newWeapons = new HashSet<string>(weapons.Except(prevWeapons));
            // Записываем 
            var framesJson = new JsonObject
            {
                ["frames"] = new JsonArray(newFrames.Select(s => JsonValue.Create(s)).ToArray()),
                ["sentinels"] = new JsonArray(newSentinels.Select(s => JsonValue.Create(s)).ToArray())
            };
            File.WriteAllText(_framesOutput, framesJson.ToJsonString(options));

            var weaponsJson = new JsonObject
            {
                ["weapons"] = new JsonArray(newWeapons.Select(s => JsonValue.Create(s)).ToArray())
            };
            File.WriteAllText(_weaponsOutput, weaponsJson.ToJsonString(options));
              



            Console.WriteLine($"Frames: {newFrames.Count} (added: {_dataFrameWeapon.newFrames.Count()})");
            Console.WriteLine($"Sentinels: {newSentinels.Count} (added: {_dataFrameWeapon.newSentinels.Count()})");
            Console.WriteLine($"Weapons: {newWeapons.Count} (added: {_dataFrameWeapon.newWeapons.Count()})");

        }

    }
 
    class GettingImages
    {
        private readonly DataFrameWeapon _dataFrameWeapon;
        private readonly HttpService _client;
        private readonly string _pathFrameImg = StoragePath.pathFrameImg;
        private readonly string _pathWeaponImg =StoragePath.pathWeaponsImg;
        private readonly string _pathSentinelsImg =StoragePath.pathSentinelsImg;

        public GettingImages(DataFrameWeapon dataFrameWeapon, HttpService httpCl)
        {
            _dataFrameWeapon = dataFrameWeapon;
            _client = httpCl;
        }

        public async Task GetImgAndDownload()
        {
            foreach (var frame in _dataFrameWeapon.newFrames!)
            {
                if (string.IsNullOrWhiteSpace(frame))
                {
                    break;
                }
                {

                    var nameFrame = frame.Replace(" ", "");
                    var nameFile = $"{frame}.png";                      
                    var pathName = Path.Combine(_pathFrameImg, nameFile);

                    var urlImgInfo = $"https://wiki.warframe.com/api.php?action=query&titles=File:{nameFrame}_Thumb.png&prop=imageinfo&iiprop=url&format=json";
                    var jsonImgInfo = await _client.FetchJson(urlImgInfo);
                    var url = jsonImgInfo!["query"]!["pages"]!.AsObject().First().Value!["imageinfo"]![0]!["url"]!.GetValue<string>();

                    var imgFrameByte = await _client.DownloadImageAsync(url!);

                    await File.WriteAllBytesAsync(pathName, imgFrameByte);
                    Console.WriteLine("Добавлено изображение frame:" + frame);

                }
            }
            foreach (var Sentinels in _dataFrameWeapon.newSentinels!)
            {
                if (string.IsNullOrWhiteSpace(Sentinels))
                {
                    break;
                }
                {

                    var nameSentinels = Sentinels.Replace(" ", "");
                    var nameFile = $"{Sentinels}.png";
                    var pathName = Path.Combine(_pathSentinelsImg, nameFile);

                    var urlImgInfo = $"https://wiki.warframe.com/api.php?action=query&titles=File:{nameSentinels}.png&prop=imageinfo&iiprop=url&format=json";
                    var jsonImgInfo = await _client.FetchJson(urlImgInfo);
                    var url = jsonImgInfo!["query"]!["pages"]!.AsObject().First().Value!["imageinfo"]![0]!["url"]!.GetValue<string>();

                    var imgFrameByte = await _client.DownloadImageAsync(url!);

                    await File.WriteAllBytesAsync(pathName, imgFrameByte);
                    Console.WriteLine("Добавлено изображение sentinels: " + Sentinels);

                }
            }
            foreach (var weapon in _dataFrameWeapon.newWeapons!)
            {
                if (string.IsNullOrWhiteSpace(weapon))
                {
                    break;
                }
                {

                    var nameWeapon = weapon.Replace(" ", "");
                    var nameFile = $"{weapon}.png";
                    var pathName = Path.Combine(_pathWeaponImg, nameFile);

                    var urlImgInfo = $"https://wiki.warframe.com/api.php?action=query&titles=File:{nameWeapon}.png&prop=imageinfo&iiprop=url&format=json";
                    var jsonImgInfo = await _client.FetchJson(urlImgInfo);
                    var url = jsonImgInfo!["query"]!["pages"]!.AsObject().First().Value!["imageinfo"]![0]!["url"]!.GetValue<string>();

                    var imgFrameByte = await _client.DownloadImageAsync(url!);

                    await File.WriteAllBytesAsync(pathName, imgFrameByte);
                    Console.WriteLine("Добавлено изображение weapon: " + weapon);

                }
            }
        }

    }

//сборка
    class WriteJsonDownloadImg
    {
        private readonly SeparateCategories _separateCategories;
        private readonly GettingImages _gettingImages;
        public WriteJsonDownloadImg(SeparateCategories separateCategories,GettingImages gettingImages)
        {
            _separateCategories = separateCategories;
            _gettingImages = gettingImages;
        }

        public async Task Run()
        {
            _separateCategories.Separate();
            await _gettingImages.GetImgAndDownload();

        }

    }
}

