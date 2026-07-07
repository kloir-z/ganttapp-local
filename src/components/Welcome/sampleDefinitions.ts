// src/components/Welcome/sampleDefinitions.ts
// WelcomeModal に表示するサンプルプロジェクトの定義。filename は
// public/samples/ 直下の zip を指す(実在チェックは sampleDefinitions.test.ts)。
// import 時に zip 内の language で UI 言語が切り替わるため、言語ごとに別ファイル。
// チュートリアル zip は scripts/gen-tutorial-sample.mjs で生成する。

export interface SampleDefinition {
    id: string;
    titleKey: string;
    descriptionKey: string;
    filename: string;
}

const jaSampleDefinitions: SampleDefinition[] = [
    {
        id: "tutorial",
        titleKey: "samples.tutorial.title",
        descriptionKey: "samples.tutorial.description",
        filename: "[サンプル]チュートリアル：Ganttyの使い方.zip"
    },
    {
        id: "corporate-site-renewal",
        titleKey: "samples.corporateSiteRenewal.title",
        descriptionKey: "samples.corporateSiteRenewal.description",
        filename: "[サンプル]コーポレートサイトリニューアルプロジェクト.zip"
    },
    {
        id: "mobile-app-development",
        titleKey: "samples.mobileAppDevelopment.title",
        descriptionKey: "samples.mobileAppDevelopment.description",
        filename: "[サンプル]スマートフォンアプリ開発プロジェクト.zip"
    },
    {
        id: "autumn-food-exhibition",
        titleKey: "samples.autumnFoodExhibition.title",
        descriptionKey: "samples.autumnFoodExhibition.description",
        filename: "[サンプル]秋の食品見本市出展プロジェクト.zip"
    },
    {
        id: "large-scale-system-development",
        titleKey: "samples.largeScaleSystemDevelopment.title",
        descriptionKey: "samples.largeScaleSystemDevelopment.description",
        filename: "[サンプル]大規模システム開発プロジェクト.zip"
    }
];

const enSampleDefinitions: SampleDefinition[] = [
    {
        id: "tutorial",
        titleKey: "samples.tutorial.title",
        descriptionKey: "samples.tutorial.description",
        filename: "[Sample]Tutorial - How to Use Gantty.zip"
    },
    {
        id: "restaurant-opening",
        titleKey: "samples.restaurantOpening.title",
        descriptionKey: "samples.restaurantOpening.description",
        filename: "[Sample]Restaurant Opening Project.zip"
    },
    {
        id: "software-product-launch",
        titleKey: "samples.softwareProductLaunch.title",
        descriptionKey: "samples.softwareProductLaunch.description",
        filename: "[Sample]Software Product Launch.zip"
    },
    {
        id: "wedding-planning",
        titleKey: "samples.weddingPlanning.title",
        descriptionKey: "samples.weddingPlanning.description",
        filename: "[Sample]Wedding Planning Project.zip"
    }
];

export const getSampleDefinitions = (language: string): SampleDefinition[] =>
    language === 'ja' ? jaSampleDefinitions : enSampleDefinitions;

// テスト用に全定義を公開(filename の実在チェックに使う)
export const allSampleDefinitions: SampleDefinition[] = [
    ...jaSampleDefinitions,
    ...enSampleDefinitions,
];
