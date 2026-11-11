<?php
namespace Tests;

abstract class TestCase extends \Illuminate\Foundation\Testing\TestCase
{
    public function createApplication()
    {
        $app = parent::createApplication();
        $connection = $app['config']->get('database.default');
        $database = (string) $app['config']->get("database.connections.{$connection}.database");
        $safe = $connection === 'sqlite'
            ? ($database === ':memory:' || str_ends_with($database, '_test.sqlite'))
            : ($connection === 'pgsql' && str_ends_with($database, '_test'));
        // Runs before RefreshDatabase traits: never migrate:fresh an application database.
        if (!$app->environment('testing') || !$safe) {
            throw new \RuntimeException('Tests require testing + SQLite :memory: or a dedicated PostgreSQL database ending in _test.');
        }
        return $app;
    }
}
