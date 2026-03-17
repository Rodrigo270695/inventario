<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\GlAccount\GlAccountRequest;
use App\Models\GlAccount;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class GlAccountController extends Controller
{
    /**
     * Flatten tree in pre-order (depth-first) and add depth to each item.
     *
     * @param  Collection<int, GlAccount>  $all  All accounts (with parent loaded)
     * @return array<int, array{id: string, code: string, name: string, account_type: string|null, parent_id: string|null, is_active: bool, created_at: string|null, updated_at: string|null, parent: object|null, depth: int}>
     */
    private function flattenTreeWithDepth(Collection $all): array
    {
        $byId = $all->keyBy('id');
        $children = $all->groupBy('parent_id');

        $result = [];

        $visit = function (?string $parentId, int $depth) use (&$visit, $children, $byId, &$result): void {
            $ids = $children->get($parentId, collect())->sortBy('code')->pluck('id');
            foreach ($ids as $id) {
                $node = $byId->get($id);
                if (! $node) {
                    continue;
                }
                $row = $node->toArray();
                $row['depth'] = $depth;
                $result[] = $row;
                $visit($id, $depth + 1);
            }
        };

        // Raíces: parent_id null o padre no está en el conjunto (filtros)
        $rootIds = $all->filter(function ($a) use ($byId) {
            return $a->parent_id === null || ! $byId->has($a->parent_id);
        })->sortBy('code')->pluck('id');

        foreach ($rootIds as $id) {
            $node = $byId->get($id);
            if (! $node) {
                continue;
            }
            $row = $node->toArray();
            $row['depth'] = 0;
            $result[] = $row;
            $visit($id, 1);
        }

        return $result;
    }

    public function index(Request $request): Response
    {
        $all = GlAccount::query()
            ->with(['parent:id,code,name'])
            ->orderBy('code')
            ->get();

        $flat = $this->flattenTreeWithDepth($all);
        $glAccountsForSelect = GlAccount::query()->orderBy('code')->get(['id', 'code', 'name']);

        return Inertia::render('admin/gl-accounts/index', [
            'glAccounts' => ['data' => $flat],
            'glAccountsForSelect' => $glAccountsForSelect,
        ]);
    }

    public function store(GlAccountRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $validated['parent_id'] = ($validated['parent_id'] ?? '') !== '' ? $validated['parent_id'] : null;

        GlAccount::create($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Cuenta contable creada correctamente.']);
    }

    public function update(GlAccountRequest $request, GlAccount $gl_account): RedirectResponse
    {
        $validated = $request->validated();
        $validated['parent_id'] = ($validated['parent_id'] ?? '') !== '' ? $validated['parent_id'] : null;

        $gl_account->update($validated);

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Cuenta contable actualizada correctamente.']);
    }

    public function destroy(GlAccount $gl_account): RedirectResponse
    {
        $gl_account->delete();

        return redirect()->back()
            ->with('toast', ['type' => 'success', 'message' => 'Cuenta contable eliminada correctamente.']);
    }
}
