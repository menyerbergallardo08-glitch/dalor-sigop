# DALOR SIGO-P | Diagnostic Audit Script
import os
import json

def print_audit():
    baseline = [
        'bcv.js', 'core.js', 'dispatch.js', 'expenses.js', 'financial.js',
        'maintenance.js', 'materials.js', 'projects.js', 'quotations.js',
        'rentals.js', 'resources.js'
    ]
    print('=== AUDITORIA DE ARQUITECTURA EXACTA DALOR SIGO-P ===')
    for mod in baseline:
        root_file = os.path.join('frontend_v2/src/modules', mod)
        folder = os.path.join('frontend_v2/src/modules', mod.replace('.js', ''))
        lines = 0
        if os.path.exists(root_file):
            with open(root_file, 'r', encoding='utf-8') as f:
                lines = len(f.readlines())
        sub_files = {}
        if os.path.isdir(folder):
            for sf in os.listdir(folder):
                sf_path = os.path.join(folder, sf)
                if sf.endswith('.js'):
                    with open(sf_path, 'r', encoding='utf-8') as sff:
                        sub_files[sf] = len(sff.readlines())
                elif os.path.isdir(sf_path):
                    # Sub-domain like financial/cxc, financial/cxp, financial/treasury
                    for nested in os.listdir(sf_path):
                        if nested.endswith('.js'):
                            with open(os.path.join(sf_path, nested), 'r', encoding='utf-8') as nf:
                                sub_files[f'{sf}/{nested}'] = len(nf.readlines())
        status = f'MODULARIZADO ({len(sub_files)} submodulos)' if sub_files else 'MONOLITO RAIZ'
        print(f'* {mod:15s} | Orquestador: {lines:4d} lineas | {status}')
        for sf, sl in sorted(sub_files.items()):
            indent = '        - ' if '/' in sf else '    - '
            print(f'{indent}{sf:32s}: {sl:4d} lineas')

if __name__ == '__main__':
    print_audit()
