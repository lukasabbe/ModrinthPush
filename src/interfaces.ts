export interface Settings {
    pushProjects: string[];
    fillDatabase: boolean;
    intervalSeconds: number;
}

export interface ModrinthProject {
    id: string;
    versions: string[];
    title: string;
    icon_url: string;

}

export interface ModrinthVersion {
    id: string;
    loaders: string[];
    game_versions: string[];
}