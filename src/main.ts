import { Plugin, MarkdownPostProcessorContext } from 'obsidian';
import { DEFAULT_SETTINGS, GraphvizSettings, GraphvizSettingsTab } from './setting';
import { Processors } from './processors';
import { Suggesters } from './suggesters';

export default class GraphvizPlugin extends Plugin {
    settings: GraphvizSettings;

    registeredProcessors: (() => void)[] = [];

    async onload() {
        console.debug('Load graphviz plugin');
        await this.loadSettings();
        this.addSettingTab(new GraphvizSettingsTab(this));

        const d3Sources = [
            'https://d3js.org/d3.v5.min.js',
            'https://unpkg.com/@hpcc-js/wasm@0.3.11/dist/index.min.js',
            'https://unpkg.com/d3-graphviz@3.0.5/build/d3-graphviz.js',
        ];

        this.app.workspace.onLayoutReady(() => {
            for (const src of d3Sources) {
                const script = document.createElement('script');
                script.src = src;
                (document.head || document.documentElement).appendChild(script);
            }

            this.reloadProcessors();

            this.registerEditorSuggest(new Suggesters(this.app, this));
        });
    }

    reloadProcessors() {
        // unregister old processors
        this.registeredProcessors.forEach((unreg) => unreg());
        this.registeredProcessors = [];

        const processors = new Processors(this);
        const targetLang = this.settings.codeblockLanguage;

        // Wrap the processor to check both lang and label
        const wrappedProcessor = async (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
            const section = ctx.getSectionInfo(el);
            if (!section) return;

            const firstLine = section.text.split('\n')[section.lineStart];
            const match = firstLine.match(/^```(?<lang>[^\s^{]+)?\s*(?:{(?<label>[^}]+)})?/);

            if (!match) return;

            const lang = match.groups?.lang ?? '';
            const label = match.groups?.label ?? '';

            if (lang === targetLang || label === targetLang) {
                if (this.settings.renderer === 'd3_graphviz') {
                    await processors.d3graphvizProcessor(source, el, ctx);
                } else {
                    await processors.imageProcessor(source, el, ctx);
                }
            }
        };

        // Register a "catch-all" codeblock processor
        const unreg = this.registerMarkdownCodeBlockProcessor(targetLang, wrappedProcessor);
        this.registeredProcessors.push(unreg);
    }

    onunload() {
        console.debug('Unload graphviz plugin');
    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        return Promise.resolve();
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
