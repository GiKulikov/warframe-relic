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

    .AddSingleton<DataJson>()
    .AddSingleton<HttpService>()
    .AddSingleton<DataFrameWeapon>()
    .AddSingleton<SeparateCategories>()
    .AddSingleton<GettingImages>()
    .AddSingleton<WriteJsonDownloadImg>()
    .BuildServiceProvider();

//Console.WriteLine($"CurrentDirectory = {Environment.CurrentDirectory}");

var jsonStorage = services.GetRequiredService<JsonStorageService>();
var dataRelics = services.GetRequiredService<DataRelic>();
var jsonDataBuilder = services.GetRequiredService<JsonDataBuilder>();
var dateService = new DateService();
var writeJsonDownloadImg = services.GetRequiredService<WriteJsonDownloadImg>();
var varziaService = services.GetRequiredService<VarziaService>();

var date = await dateService.ReadingDateMain();
var updateVarzia = await dateService.ReadingDateVarzia();



if (DateTime.Now > updateVarzia)
{
    Console.WriteLine("Проверка наличия обновлений реликвий варзии");

    await dataRelics.GetVarziaRelics();

    bool statusVarzia = await varziaService.GetStatus();
    if (statusVarzia)
    {
        Console.WriteLine("Обновление варзии");
        await jsonStorage.Update(JsonStorageService.UpdateTarget.Varzia);

        Console.WriteLine("Обновление изображений");
        await writeJsonDownloadImg.Run();
    }
    else
    {
        await jsonStorage.RecordStatusVarzia();
        Console.WriteLine("нет обновления варзии");
    }


}
else
{
    TimeSpan diff = updateVarzia - DateTime.Now;
    Console.WriteLine("Осталось до варзии: " + diff.Days + " д");

}



if (DateTime.Now.Date >= date)
{
    await dateService.RecordDate();

    await dataRelics.GetCurrentRelics();
    jsonDataBuilder.UpdateRelicsJson();


    if (jsonDataBuilder._NewRelic == null || jsonDataBuilder._NewRelic.Count == 0)
    {
        Console.WriteLine("Нет новых текущих реликвий");
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










