import {
    App,
    Editor,
    EditorPosition,
    EditorSuggest,
    EditorSuggestContext,
    EditorSuggestTriggerInfo,
    TFile,
} from 'obsidian';
import type GraphvizPlugin from 'src/main';

interface IGraphCompletion {
    label: string;
}

export class Suggesters extends EditorSuggest<IGraphCompletion> {
    app: App;
    private plugin: GraphvizPlugin;

    constructor(app: App, plugin: GraphvizPlugin) {
        super(app);
        this.app = app;
        this.plugin = plugin;

        this.scope.register(['Shift'], 'Enter', (evt: KeyboardEvent) => {
            this.suggestions.useSelectedItem(evt);
            return false;
        });
    }

    getSuggestions(context: EditorSuggestContext): IGraphCompletion[] {
        const suggestions = this.getGraphSuggestions(context);
        return suggestions.length ? suggestions : [];
    }

    getGraphSuggestions(context: EditorSuggestContext): IGraphCompletion[] {
        context.editor.getLine(context.end.line); // side effect if needed
        return 'dot/neato/fdp/sfdp/circo/osage/patchwork'.split('/').map((app) => ({ label: app }));
    }

    renderSuggestion(suggestion: IGraphCompletion, el: HTMLElement): void {
        el.setText('insert ' + suggestion.label + ' example');
    }

    selectSuggestion(suggestion: IGraphCompletion, _event: KeyboardEvent | MouseEvent): void {
        const { editor } = this.context;

        const hints = new Map<string, string[]>();
        hints.set('dot', ['/*', 'a -> b -> a;', 'a [color=blue];', '*/']);
        hints.set('neato', ['mode="major";  // KK/sgd/hier/ipsep', '/* a -- b -- c; */']);
        hints.set('patchwork', ['/* "foo" [area=100 fillcolor=gold] */']);

        const grouping = suggestion.label.startsWith('dot') ? 'digraph' : 'graph';
        const result =
            `${grouping} ${suggestion.label[0]} {\n    layout=${suggestion.label};\n` +
            (hints.get(suggestion.label) || []).map((l) => '    ' + l).join('\n');

        editor.replaceRange(result + '\n\n}', this.context.end);
    }

    onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile): EditorSuggestTriggerInfo {
        const triggerPhrase = '```dot';
        const startPos = this.context?.start || {
            line: cursor.line,
            ch: cursor.ch - triggerPhrase.length,
        };

        if (!editor.getRange(startPos, cursor).startsWith(triggerPhrase)) {
            return null;
        }

        if (editor.getLine(cursor.line + 1) !== '```') {
            return null;
        }

        return {
            start: startPos,
            end: cursor,
            query: editor.getRange(startPos, cursor).substring(triggerPhrase.length),
        };
    }
}
