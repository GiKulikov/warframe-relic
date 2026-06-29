using System.Text.RegularExpressions;
using HtmlAgilityPack;
using System.Text.Json;
using System.Data;
using System.Text.Json.Nodes;



namespace updatingDataRelic
{
    static class Links
    {
        public static readonly HttpClient client;
        public static readonly string urlDroptable =
        "https://www.warframe.com/droptables";
        public static readonly string varziaUrl =
        "https://wiki.warframe.com/api.php?action=query&titles=Prime_Vault&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2";
        public static readonly string varziaDateUrl =
        "https://api.warframestat.us/pc/vaultTrader";

        public static readonly string primesJson = "./data/primes.json";
        public static readonly string relicsJson = "./data/relics.json";
        public static readonly string varziaJson = "./data/varziaRelic.json";
        public static readonly string dateJson = "./data/last_update.json";



        static Links()
        {
            client = new HttpClient();
            client.DefaultRequestHeaders.UserAgent.ParseAdd(
                "WarframeRelicBot/1.0");
            client.Timeout = TimeSpan.FromSeconds(120);
        }
    }
    //Кеш страниц
    public static class HtmlCache
    {
        private static readonly Dictionary<string, string> _cache = new();

        public static async Task<string> GetPageAsync(
            HttpClient client,
            string url)
        {
            if (_cache.TryGetValue(url, out var html))
                return html;

            html = await client.GetStringAsync(url);

            _cache[url] = html;

            return html;
        }
    }
    //сбор данных
    class DataRelic
    {
        private readonly HttpClient _client = Links.client;
        private readonly string _urlDroptable = Links.urlDroptable;
        private readonly string _varziaUrl = Links.varziaUrl;
        public readonly RelicState _relicState;

        public DataRelic(RelicState relicState)
        {
            _relicState = relicState;
        }

        public async Task GetCurrentRelics()
        {

            string html = await HtmlCache.GetPageAsync(_client, _urlDroptable);

            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            // Находим h3 с id="missionRewards"
            var h3Node = doc.DocumentNode.SelectSingleNode("//h3[@id='missionRewards']");
            if (h3Node == null)
            {
                throw new InvalidOperationException("Заголовок missionRewards не найден!");

            }

            // Ищем следующую таблицу после этого h3
            var tableNode = h3Node.SelectSingleNode("following-sibling::table[1]");
            if (tableNode == null)
            {
                throw new InvalidOperationException("Таблица не найдена!");

            }

            // Читаем строки таблицы
            var rows = tableNode.SelectNodes(".//tr");
            if (rows == null)
            {
                throw new InvalidOperationException("Строки не найдены!");

            }


            var pattern = @"\b(Lith|Meso|Neo|Axi)\s+[A-Z]\d+\s+Relic\b";

            foreach (var row in rows)
            {

                var cells = row.SelectNodes(".//td");
                if (cells == null) continue;

                var cellTexts = cells.Select(c => c.InnerText.Trim()).ToArray();

                foreach (var cell in cellTexts)
                {
                    var matches = Regex.Matches(cell, pattern);
                    foreach (Match m in matches)
                    {
                        string name = m.Value.Trim();
                        _relicState.currentRelics.Add(name);
                    }
                }
            }
            Console.WriteLine($"Найдено реликвий: {_relicState.currentRelics.Count}");
            

        }

        public async Task GetVarziaRelics()
        {
            string json = await HtmlCache.GetPageAsync(_client, _varziaUrl);

            using JsonDocument doc = JsonDocument.Parse(json);

            string wikiText =
                doc.RootElement
                   .GetProperty("query")
                   .GetProperty("pages")[0]
                   .GetProperty("revisions")[0]
                   .GetProperty("slots")
                   .GetProperty("main")
                   .GetProperty("content")
                   .GetString() ?? "";

            string[] lines = wikiText.Split('\n');

            string lastRelic = "";

            foreach (string line in lines)
            {
                Match relicMatch =
                    Regex.Match(line, @"\{\{Relic\|([^}]+)\}\}");

                if (relicMatch.Success)
                {
                    lastRelic = relicMatch.Groups[1].Value.Trim();
                }

                if (Regex.IsMatch(line, @"class=""posTextIcon""") && !string.IsNullOrWhiteSpace(lastRelic))
                {
                    lastRelic += " Relic";
                    _relicState.varziaRelics.Add(lastRelic);
                }
            }

            Console.WriteLine($"Найдено: {_relicState.varziaRelics.Count}");

            
        }

    }
    //Модели данных
    public class RelicState
    {
        public HashSet<string> currentRelics = new HashSet<string>();
        public HashSet<string> varziaRelics = new HashSet<string>();

    }
    public class SemanticItem
    {
        public string? item { get; set; }
        public string? relic { get; set; }
    }
    public class SemanticSnapshot
    {
        public Dictionary<string, List<SemanticItem>> current { get; set; } = new();
        public Dictionary<string, List<SemanticItem>> added { get; set; } = new();
        public Dictionary<string, List<SemanticItem>> removed { get; set; } = new();
    }
    public class VarziaDate
    {
        public string? startDate { get; set; }
        public string? endDate { get; set; }
    }
    //создание смыловых групп
    class SemanticGroupsService
    {
        private readonly HttpClient _client = Links.client;
        private readonly string _urlDroptable = Links.urlDroptable;
        private static string? GetGroupName(string itemName)
        {
            int primeIndex = itemName.IndexOf(" Prime", StringComparison.Ordinal);

            if (primeIndex == -1)
                return null;

            return itemName.Substring(0, primeIndex + " Prime".Length);
        }
        public async Task<Dictionary<string, List<SemanticItem>>> GetRelicDescription(HashSet<string> anyRelics)
        {
            var html = await HtmlCache.GetPageAsync(_client, _urlDroptable);


            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            var semanticGroups = new Dictionary<string, List<SemanticItem>>();

            // Находим таблицу с наградами реликвий
            var h3Node = doc.DocumentNode.SelectSingleNode("//h3[@id='relicRewards']");
            if (h3Node == null)
            {
                Console.WriteLine("Заголовок relicRewards не найден!");
                return semanticGroups;
            }

            var tableNode = h3Node.SelectSingleNode("following-sibling::table[1]");
            if (tableNode == null)
            {
                Console.WriteLine("Таблица не найдена!");
                return semanticGroups;
            }

            var rows = tableNode.SelectNodes(".//tr");
            if (rows == null)
            {
                Console.WriteLine("Строки не найдены!");
                return semanticGroups;
            }

            string? currentRelic = null;
            bool readingRelic = false;

            foreach (var row in rows)
            {
                var th = row.SelectSingleNode("./th");

                // Заголовок реликвии
                if (th != null)
                {
                    string title = HtmlEntity.DeEntitize(th.InnerText.Trim());

                    readingRelic = false;
                    currentRelic = null;

                    // Берём только Intact
                    if (!title.EndsWith("(Intact)"))
                        continue;

                    string relicName = title.Replace(" (Intact)", "");

                    // Берём только актуальные реликвии
                    if (!anyRelics.Contains(relicName))
                        continue;

                    currentRelic = relicName.Replace(" Relic", "");
                    readingRelic = true;

                    continue;
                }


                if (!readingRelic || currentRelic == null)
                    continue;

                if (row.GetClasses().Contains("blank-row"))
                    continue;

                var tdNodes = row.SelectNodes("./td");

                if (tdNodes == null || tdNodes.Count == 0)
                    continue;

                string itemName = HtmlEntity.DeEntitize(tdNodes[0].InnerText.Trim());

                string? groupName = GetGroupName(itemName);

                if (groupName == null)
                    continue;

                if (!semanticGroups.TryGetValue(groupName, out var items))
                {
                    items = new List<SemanticItem>();
                    semanticGroups[groupName] = items;
                }

                items.Add(new SemanticItem
                {
                    item = itemName,
                    relic = currentRelic
                });
            }

            return semanticGroups;
        }
    }
    //Сбор доп. данных варзии
    class VarziaService
    {
        private readonly RelicState _relicState;
        public VarziaService(RelicState relicState)
        {
            _relicState = relicState;
        }
        private readonly string _varziaDateUrl = Links.varziaDateUrl;
        private readonly string _varziaJson = Links.varziaJson;
        private readonly HttpClient _client = Links.client;
        public async Task<VarziaDate> GetDate()
        {
            string json = await HtmlCache.GetPageAsync(_client, _varziaDateUrl);

            if (!string.IsNullOrWhiteSpace(json))
            {
                JsonDocument doc = JsonDocument.Parse(json);
                return new VarziaDate
                {
                    startDate = doc.RootElement.GetProperty("activation").GetString(),
                    endDate = doc.RootElement.GetProperty("expiry").GetString()
                };

            }
            return new VarziaDate();
        }
        public async Task<bool> GetStatus()
        {
            var lastRelic = new HashSet<string>();

            var json = await File.ReadAllTextAsync(_varziaJson);
            if (string.IsNullOrWhiteSpace(json))
            {
                return true;
            }
            using var doc = JsonDocument.Parse(json);

            var newRelic = _relicState.varziaRelics;
            bool hasPeriod = doc.RootElement.TryGetProperty("varziaPeriod", out _);
            if (!hasPeriod)
            {
                return true;
            }

            foreach (var item in doc.RootElement.EnumerateObject())
            {

                if (item.Name == "varziaPeriod") continue;
                if (item.Value.ValueKind != JsonValueKind.Array) continue;
                foreach (var prop in item.Value.EnumerateArray())
                {
                    var relic = prop.GetProperty("relic").GetString()!;
                    lastRelic.Add(relic);

                }


            }

            return newRelic.SetEquals(lastRelic);
        }

    }
    //сравнивание 
    class JsonDataBuilder
    {
        private readonly string _primesJson = Links.primesJson;
        private readonly string _relicsJson = Links.relicsJson;

        public List<string>? _NewRelic;

        private readonly DataRelic _dataRelic;
        private readonly RelicState _relicState;
        private readonly VarziaService _varziaService;
        private readonly SemanticGroupsService _semanticGroup;

        public JsonDataBuilder(DataRelic dataRelic, RelicState relicState, VarziaService varziaService, SemanticGroupsService semanticGroupsService)
        {
            _dataRelic = dataRelic;
            _relicState = relicState;
            _varziaService = varziaService;
            _semanticGroup = semanticGroupsService;
        }

        JsonSerializerOptions options = new JsonSerializerOptions { WriteIndented = true };


        private void AddTo(Dictionary<string, List<SemanticItem>> dict, string frame, SemanticItem item)
        {
            if (!dict.ContainsKey(frame)) dict[frame] = new();
            dict[frame].Add(item);
        }

        public async Task UpdatingStatusPrime()
        {
            if (!File.Exists(_primesJson)) return;

            var jsonRead = await File.ReadAllTextAsync(_primesJson);
            if (string.IsNullOrWhiteSpace(jsonRead)) return;

            var snapshot = JsonSerializer.Deserialize<SemanticSnapshot>(jsonRead, options);
            if (snapshot is null) return;

            foreach (var (frame, items) in snapshot.added)
            {
                if (!snapshot.current.ContainsKey(frame))
                    snapshot.current[frame] = new();

                snapshot.current[frame].AddRange(items);
            }

            snapshot.added = new Dictionary<string, List<SemanticItem>>();

            var jsonWrite = JsonSerializer.Serialize(snapshot, options);
            await File.WriteAllTextAsync(_primesJson, jsonWrite);
        }
        public async Task UpdatingStatusRelic()
        {
            var jsonReadRelic = await File.ReadAllTextAsync(_relicsJson);
            if (jsonReadRelic == null) return;
            var parseRelic = JsonNode.Parse(jsonReadRelic);
            

            var added = parseRelic?["added"]?.AsArray().Select(x => x?.GetValue<string>()).ToList();
            var current = parseRelic?["current"]?.AsArray().Select(x => x?.GetValue<string>()).ToList();

            
            var dict = new Dictionary<string, List<string>>
            {
                ["current"] =(current?? []).Concat(added?? []).ToList()!,
                ["added"] = new List<string>()
            };

            var jsonWriteRelic = JsonSerializer.Serialize(dict, options);
            await File.WriteAllTextAsync(_relicsJson, jsonWriteRelic);
        }
        public async Task<SemanticSnapshot> UpdatePrimesJson()
        {
            var newData = await _semanticGroup.GetRelicDescription(_relicState.currentRelics);


            Dictionary<string, List<SemanticItem>> oldData = new();


            if (File.Exists(_primesJson))
            {
                var jsonRead = await File.ReadAllTextAsync(_primesJson);
                if (!string.IsNullOrWhiteSpace(jsonRead))
                {
                    var old = JsonSerializer.Deserialize<SemanticSnapshot>(jsonRead, options);

                    foreach (var (frame, items) in old!.current)
                        oldData[frame] = items;
                    foreach (var (frame, items) in old!.added)
                    {
                        if (!oldData.ContainsKey(frame)) oldData[frame] = new();
                        oldData[frame].AddRange(items);
                    }
                }
            }


            var current = new Dictionary<string, List<SemanticItem>>();
            var added = new Dictionary<string, List<SemanticItem>>();
            var removed = new Dictionary<string, List<SemanticItem>>();


            foreach (var (frame, newItems) in newData)
            {
                oldData.TryGetValue(frame, out var oldItems);

                foreach (var newItem in newItems)
                {
                    bool existsInOld = oldItems?.Any(o =>
                        o.item == newItem.item &&
                        o.relic == newItem.relic) ?? false;

                    if (existsInOld)
                        AddTo(current, frame, newItem);
                    else
                        AddTo(added, frame, newItem);
                }
            }


            foreach (var (frame, oldItems) in oldData)
            {
                newData.TryGetValue(frame, out var newItems);

                foreach (var oldItem in oldItems)
                {
                    bool existsInNew = newItems?.Any(n =>
                        n.item == oldItem.item &&
                        n.relic == oldItem.relic) ?? false;

                    if (!existsInNew)
                        AddTo(removed, frame, oldItem);
                }
            }
            var snapshot = new SemanticSnapshot
            {
                current = current,
                added = added,
                removed = removed
            };

            return snapshot;







        }
        public async Task<Dictionary<string, object>> UpdateVarziaJson()
        {
            await _dataRelic.GetVarziaRelics();
            var result = new Dictionary<string, object>();
            var group = await _semanticGroup.GetRelicDescription(_relicState.varziaRelics);
            var status = await _varziaService.GetStatus();

            result["status"] = status ? "Update" : "NotUpdate";
            result["varziaPeriod"] = await _varziaService.GetDate();
            foreach (var item in group)
            {
                result[item.Key] = item.Value;
            }
            return result;

        }
        public Dictionary<string, List<string>> UpdateRelicsJson()
        {

            var newRelics = new HashSet<string>();
            foreach (var relic in _relicState.currentRelics)
                newRelics.Add(relic.Replace("Relic", "").Trim());

            var jsonRead = File.ReadAllText(_relicsJson);

            if (string.IsNullOrWhiteSpace(jsonRead))
            {
                return new Dictionary<string, List<string>>
                {
                    ["current"] = new List<string>(),
                    ["added"] = newRelics.ToList()
                };
            }

            using var doc = JsonDocument.Parse(jsonRead);
            var oldRelics = new HashSet<string>();

            if (doc.RootElement.TryGetProperty("current", out var currentEl))
                foreach (var item in currentEl.EnumerateArray())
                    oldRelics.Add(item.GetString()!);

            if (doc.RootElement.TryGetProperty("added", out var addedEl))
                foreach (var item in addedEl.EnumerateArray())
                    oldRelics.Add(item.GetString()!);

            _NewRelic = newRelics.Except(oldRelics).ToList();


            return new Dictionary<string, List<string>>
            {
                ["current"] = oldRelics.Intersect(newRelics).ToList(),
                ["added"] = newRelics.Except(oldRelics).ToList()

            };

        }
    }
    //проверка даты
    class DateService
    {
        private readonly string _dateJson = Links.dateJson;
        private readonly string _varziaJson = Links.varziaJson;
        JsonSerializerOptions options = new JsonSerializerOptions { WriteIndented = true };


         public async Task RecordDate()
        {
            var result = new Dictionary<string, object>();

            string date = DateTime.Now.ToString("yyyy-MM-dd");
            result["date"] = date;
            await File.WriteAllTextAsync(_dateJson, JsonSerializer.Serialize(result, options));


        }
        public async Task<DateTime?> ReadingDateMain()
        {
            var jsonData = await File.ReadAllTextAsync(_dateJson);
            if (string.IsNullOrWhiteSpace(jsonData)) return null;
            var obj = JsonNode.Parse(jsonData)!.AsObject();
            var date = obj["date"]!.GetValue<string>();
            var parse = DateTime.Parse(date);
            var result = parse.AddDays(10);
            return result;
        }
        public async Task<DateTime> ReadingDateVarzia()
        {
            var jsonData = await File.ReadAllTextAsync(_varziaJson);
            var obj = JsonNode.Parse(jsonData)!.AsObject();
            var endDate = obj["varziaPeriod"]!["endDate"]!.GetValue<string>();
            var parseEndDate = DateTime.Parse(endDate);

            return parseEndDate;


        }
    }
    //запись 
    class JsonStorageService
    {
        JsonDataBuilder _jsonDataBuilder;
        private string _primesJson = Links.primesJson;
        private string _varziaJson = Links.varziaJson;
        private string _relicsJson = Links.relicsJson;

        JsonSerializerOptions options = new JsonSerializerOptions { WriteIndented = true };

        public JsonStorageService(JsonDataBuilder jsonDataBuilder)
        {
            _jsonDataBuilder = jsonDataBuilder;
        }

        public async Task RecordRelicJson()
        {
            var result = _jsonDataBuilder.UpdateRelicsJson();
            await File.WriteAllTextAsync(_relicsJson, JsonSerializer.Serialize(result, options));
        }
        public async Task RecordPrimesJson()
        {
            var snapshot = await _jsonDataBuilder.UpdatePrimesJson();
            await File.WriteAllTextAsync(_primesJson, JsonSerializer.Serialize(snapshot, options));
        }
        public async Task RecordVarziaJson()
        {
            var result = await _jsonDataBuilder.UpdateVarziaJson();
            await File.WriteAllTextAsync(_varziaJson, JsonSerializer.Serialize(result, options));
        }
       


        public enum UpdateTarget
        {
            Primes,
            Varzia,
            Relic
        }
        public async Task Update(UpdateTarget updateTarget)
        {
            switch (updateTarget)
            {
                case UpdateTarget.Primes:

                    await RecordPrimesJson();

                    break;
                case UpdateTarget.Varzia:
                    await RecordVarziaJson();

                    break;
                case UpdateTarget.Relic:

                    await RecordRelicJson();

                    break;
            }


        }
    }
}
