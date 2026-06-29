using updatingDataRelic;
using updateImg;
using Microsoft.Extensions.DependencyInjection;

//services
var services = new ServiceCollection()
    .AddSingleton<RelicState>()
    .AddSingleton<DataRelic>()
    .AddSingleton<VarziaService>()
    .AddSingleton<SemanticGroupsService>()
    .AddSingleton<JsonDataBuilder>()
    .AddSingleton<JsonStorageService>()
    .AddSingleton<DateService>()

    .AddSingleton<DataJson>()
    .AddSingleton<HttpService>()
    .AddSingleton<DataFrameWeapon>()
    .AddSingleton<SeparateCategories>()
    .AddSingleton<GettingImages>()
    .AddSingleton<WriteJsonDownloadImg>()
    .BuildServiceProvider();

var jsonStorage = services.GetRequiredService<JsonStorageService>();
var dataRelics = services.GetRequiredService<DataRelic>();
var jsonDataBuilder = services.GetRequiredService<JsonDataBuilder>();
var dateService = services.GetRequiredService<DateService>();
var writeJsonDownloadImg = services.GetRequiredService<WriteJsonDownloadImg>();

var date = await dateService.ReadingDateMain();
var updateVarzia = await dateService.ReadingDateVarzia();



if (DateTime.UtcNow > updateVarzia)
{
    Console.WriteLine("Обновление варзии");
    await jsonStorage.Update(JsonStorageService.UpdateTarget.Varzia);
    await writeJsonDownloadImg.Run();


}
else
{
    TimeSpan diff = updateVarzia - DateTime.Now;
    Console.WriteLine("Осталось до варзии: " + diff.Days + " д");

}


Console.WriteLine("проверка на обновление");

if (DateTime.UtcNow.Date >= date)
{
    await dateService.RecordDate();

    await dataRelics.GetCurrentRelics();
    jsonDataBuilder.UpdateRelicsJson();


    if (jsonDataBuilder._NewRelic == null || jsonDataBuilder._NewRelic.Count == 0)
    {
        Console.WriteLine("Нет новых реликвий");
        await jsonDataBuilder.UpdatingStatusRelic();
        await jsonDataBuilder.UpdatingStatusPrime();

        return;
    }

    Console.WriteLine("Обновление реликвий и частей");

    await jsonStorage.Update(JsonStorageService.UpdateTarget.Primes);
    await jsonStorage.Update(JsonStorageService.UpdateTarget.Relic);

    Console.WriteLine("Обновление изображений");

    await writeJsonDownloadImg.Run();



}










