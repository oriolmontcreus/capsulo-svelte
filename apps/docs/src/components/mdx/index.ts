import A from './A.astro';
import Callout from './Callout.astro';
import ComponentPreview from '../previews/ComponentPreview.astro';
import Previews from '../previews/Previews.astro';
import TypeTable from '../previews/TypeTable.astro';
import Card from './Card.astro';
import Cards from './Cards.astro';
import CodeBlock from './CodeBlock.astro';
import File from './File.astro';
import Files from './Files.astro';
import Folder from './Folder.astro';
import GithubInfo from './GithubInfo.astro';
import H2 from './H2.astro';
import H3 from './H3.astro';
import H4 from './H4.astro';
import H5 from './H5.astro';
import H6 from './H6.astro';
import InfoCard from './InfoCard.astro';
import InfoCards from './InfoCards.astro';
import Step from './Step.astro';
import Steps from './Steps.astro';
import Tab from './Tab.astro';
import Table from './Table.astro';
import Tabs from './Tabs.astro';

/**
 * Components every MDX page can use without importing them: overrides for plain
 * Markdown elements (as Fumadocs' defaults did) plus the docs' own blocks.
 */
export const mdxComponents = {
  a: A,
  pre: CodeBlock,
  table: Table,
  h2: H2,
  h3: H3,
  h4: H4,
  h5: H5,
  h6: H6,
  Callout,
  ComponentPreview,
  Previews,
  TypeTable,
  Card,
  Cards,
  File,
  Files,
  Folder,
  GithubInfo,
  InfoCard,
  InfoCards,
  Step,
  Steps,
  Tab,
  Tabs,
};
