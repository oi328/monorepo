<?php

namespace App\Contracts;

interface MetaApiClientInterface
{
    /**
     * Send a GET request to the Meta Graph API.
     *
     * @param string $endpoint The API endpoint (e.g., '/me/accounts')
     * @param array $params Query parameters (e.g., ['fields' => 'id,name', 'access_token' => '...'])
     * @return array The response data (decoded JSON)
     * @throws \Exception If the request fails
     */
    public function get(string $endpoint, array $params = []): array;

    /**
     * Send a POST request to the Meta Graph API.
     *
     * @param string $endpoint The API endpoint
     * @param array $data The request body data
     * @return array The response data (decoded JSON)
     * @throws \Exception If the request fails
     */
    public function post(string $endpoint, array $data = []): array;
}
