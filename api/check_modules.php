$modules = App\Models\Module::all();
foreach ($modules as $module) {
    echo "ID: {$module->id}, Name: {$module->name}, Slug: '{$module->slug}', Key: '{$module->key}'\n";
}
